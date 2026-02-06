from rest_framework import viewsets, mixins, generics
from rest_framework.permissions import AllowAny
from content.models import FAQ, Testimonial, ContactMessage
from content.api.serializers import FAQSerializer, TestimonialSerializer, ContactMessageSerializer

class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for FAQs.
    """
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [AllowAny]
    pagination_class = None # FAQs usually don't need pagination

class TestimonialViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for Testimonials.
    """
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    permission_classes = [AllowAny]
    pagination_class = None

class ContactMessageCreateView(generics.CreateAPIView):
    """
    Create a new contact message.
    Public endpoint.
    """
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [AllowAny]
