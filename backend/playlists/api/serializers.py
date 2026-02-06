from rest_framework import serializers
from playlists.models import Playlist
from blogs.api.serializers import UserSerializer, BlogSerializer
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
    
    # Stats fields
    blog_count = serializers.SerializerMethodField()
    total_views = serializers.SerializerMethodField()
    total_likes = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            'id', 'owner', 'name', 'slug', 'description', 'thumbnail', 'cover_image',
            'blogs', 'blog_ids', 'is_public', 'created_at', 'updated_at',
            'blog_count', 'total_views', 'total_likes'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['owner'] = user
        return super().create(validated_data)

    def get_blog_count(self, obj):
        """Return the number of blogs in this playlist"""
        if hasattr(obj, 'blogs_count'):
            return obj.blogs_count
        return obj.blogs.count()

    def get_total_views(self, obj):
        """Return total views across all blogs in this playlist"""
        from blogs.models import BlogView
        total = 0
        for blog in obj.blogs.all():
            total += BlogView.objects.filter(blog=blog).count()
        return total

    def get_total_likes(self, obj):
        """Return total likes across all blogs in this playlist"""
        # Use annotated value if available (from PublicPlaylistListView)
        if hasattr(obj, 'total_likes'):
            return obj.total_likes or 0
            
        from blogs.models import BlogLike
        total = 0
        for blog in obj.blogs.all():
            total += BlogLike.objects.filter(blog=blog).count()
        return total
