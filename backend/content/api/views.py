from rest_framework import viewsets, mixins
from rest_framework.permissions import AllowAny
from content.models import FAQ, Testimonial
from content.api.serializers import FAQSerializer, TestimonialSerializer

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
