from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from blog.serializers import ContactEntrySerializer


class ContactCreateView(generics.CreateAPIView):
    """Public contact form.

    Throttled per-IP: it is unauthenticated and writes a row per call.
    """

    serializer_class = ContactEntrySerializer
    permission_classes = [AllowAny]
    throttle_scope = 'contact'

    @extend_schema(summary="Send a contact message", responses={201: None})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # A `detail` message, not the stored row: the caller does not need its
        # own submission echoed back, and the frontend parses `{detail}`.
        return Response(
            {"detail": "Thank you! Your message has been sent successfully."},
            status=status.HTTP_201_CREATED,
        )
