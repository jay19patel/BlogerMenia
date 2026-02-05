from rest_framework import serializers
from notes.models import Note
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image']

    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

class NoteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    tags_list = serializers.ListField(source='get_tags_list', read_only=True)
    total_likes = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id', 'user', 'title', 'content', 'tags', 'tags_list', 
            'is_public', 'created_at', 'updated_at', 
            'total_likes', 'is_liked'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.liked_by.filter(id=request.user.id).exists()
        return False

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)
