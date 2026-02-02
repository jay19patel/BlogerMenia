from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from blogs.models import FAQ, Testimonial
from rest_framework import serializers

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer']

class TestimonialSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    class Meta:
        model = Testimonial
        fields = ['id', 'user', 'content']
    
    def get_user(self, obj):
        return {
            'username': obj.user.username,
            'full_name': obj.user.get_display_name(),
            'profile_image': obj.user.profile_image.url if obj.user.profile_image else None
        }

class ContentViewSet(viewsets.GenericViewSet):
    @action(detail=False, methods=['get'])
    def faqs(self, request):
        faqs = FAQ.objects.all()
        serializer = FAQSerializer(faqs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def testimonials(self, request):
         # Create a dummy testimonial if none exists just to show something (optional, but good for "sahi se")
        testimonials = Testimonial.objects.all()
        serializer = TestimonialSerializer(testimonials, many=True)
        return Response(serializer.data)
