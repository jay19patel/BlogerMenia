from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.serializers import (
    CurrentUserSerializer,
    EmailTokenObtainPairSerializer,
    UserRegistrationSerializer,
)
from blog.selectors import user_queryset

User = get_user_model()


@extend_schema_view(post=extend_schema(summary="Sign in and get a token pair"))
class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    # Unauthenticated and credential-checking: the endpoint credential stuffing
    # aims at. Rate limited per IP.
    throttle_scope = 'login'


@extend_schema_view(post=extend_schema(summary="Exchange a refresh token"))
class TokenRefreshThrottledView(TokenRefreshView):
    throttle_scope = 'login'


@extend_schema_view(post=extend_schema(summary="Register an account"))
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {'refresh': str(refresh), 'access': str(refresh.access_token)},
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(summary="The signed-in user"),
    patch=extend_schema(summary="Update your own profile"),
)
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = (IsAuthenticated,)
    throttle_scope = 'read'

    def get_object(self):
        # Re-fetched through the annotated queryset so the counts come from the
        # database rather than one COUNT per field.
        return user_queryset(User).get(pk=self.request.user.pk)
