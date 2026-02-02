from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from blogs.models import FAQ, Testimonial
from rest_framework import serializers

class FAQSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    question = serializers.CharField()
    answer = serializers.CharField()

class TestimonialSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    user = serializers.SerializerMethodField()
    content = serializers.CharField()
    
    def get_user(self, obj):
        if obj.user:
             return {
                'username': obj.user.username,
                'full_name': obj.user.get_display_name(),
                'profile_image': obj.user.profile_image.url if obj.user.profile_image else None
            }
        return {'username': 'Unknown', 'full_name': 'Unknown User', 'profile_image': None}

class ContentViewSet(viewsets.GenericViewSet):
    @action(detail=False, methods=['get'])
    def faqs(self, request):
        faqs = list(FAQ.objects.all())
        serializer = FAQSerializer(faqs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def testimonials(self, request):
        testimonials = list(Testimonial.objects.all())
        serializer = TestimonialSerializer(testimonials, many=True)
        return Response(serializer.data)
