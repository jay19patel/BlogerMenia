from rest_framework import serializers
from content.models import FAQ, Testimonial
from users.api.serializers import UserSerializer

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'

class TestimonialSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Testimonial
        fields = ['id', 'user', 'content']
