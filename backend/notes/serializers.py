from rest_framework import serializers
from .models import Note
from blogs.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image']

class NoteSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)
    title = serializers.CharField()
    content = serializers.CharField()
    tags = serializers.CharField(required=False, allow_blank=True)
    tags_list = serializers.ListField(source='get_tags_list', read_only=True)
    
    is_public = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    total_likes = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.id in obj.liked_by
        return False

    def create(self, validated_data):
        user = self.context['request'].user
        note = Note(user_id=user.id, **validated_data)
        note.save()
        return note

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
