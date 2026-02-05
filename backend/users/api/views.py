from rest_framework import generics, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from users.serializers import UserSerializer

User = get_user_model()

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or Update User Profile.
    Public Read: Anyone can view a profile by username.
    Private Update: Only the owner can update their profile.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        username = self.kwargs.get('username')
        # If requesting own profile/update, verify identity
        if self.request.method not in permissions.SAFE_METHODS:
            if self.request.user.username != username:
                 self.permission_denied(self.request)
        
        return get_object_or_404(User, username=username)
