from rest_framework import serializers
from playlists.models import Playlist
from blogs.serializers import UserSerializer, BlogSerializer
from blogs.models import Blog

class PlaylistSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    blogs = BlogSerializer(many=True, read_only=True)
    blog_ids = serializers.PrimaryKeyRelatedField(
        queryset=Blog.objects.all(), source='blogs', write_only=True, many=True, required=False
    )
    thumbnail = serializers.ImageField(required=False, allow_null=True)
    # Alias thumbnail to cover_image for frontend compatibility
    cover_image = serializers.ImageField(source='thumbnail', read_only=True)

    class Meta:
        model = Playlist
        fields = [
            'id', 'owner', 'name', 'slug', 'description', 'thumbnail', 'cover_image',
            'blogs', 'blog_ids', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['owner'] = user
        return super().create(validated_data)
