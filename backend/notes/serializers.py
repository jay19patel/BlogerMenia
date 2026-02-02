from rest_framework import serializers
from .models import Note
from blogs.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_image']

class NoteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    tags_list = serializers.ListField(source='get_tags_list', read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'user', 'title', 'content', 'tags', 'tags_list', 'is_public', 'created_at', 'updated_at', 'total_likes', 'is_liked']
        read_only_fields = ['user', 'created_at', 'updated_at', 'total_likes', 'is_liked']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def create(self, validated_data):
        user = self.context['request'].user
        return Note.objects.create(user=user, **validated_data)
