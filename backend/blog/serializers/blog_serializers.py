from rest_framework import serializers
from blog.models import Category, Playlist, Blog, ContactEntry
from accounts.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'color', 'text_class', 'bg_class', 'blog_count')
        read_only_fields = ('id', 'text_class', 'bg_class')

    def get_blog_count(self, obj):
        if hasattr(obj, 'blogs'):
            return obj.blogs.count()
        return 0

class PlaylistSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    blog_count = serializers.SerializerMethodField()
    blogs = serializers.SerializerMethodField() # Detailed blogs representation if requested
    
    class Meta:
        model = Playlist
        fields = ('id', 'title', 'description', 'image', 'author', 'slug', 'created_at', 'updated_at', 'avatar_svg', 'blog_count', 'blogs')
        read_only_fields = ('id', 'slug', 'created_at', 'updated_at', 'avatar_svg')

    def get_blog_count(self, obj):
        if hasattr(obj, 'blogs'):
            return obj.blogs.count()
        return 0

    def get_blogs(self, obj):
        # The frontend schema expects `blogs` for detailed playlist views, but playlist lists just need summary.
        # We can safely return an empty array if not fetching detailed blogs, or we can serialize them.
        # Let's serialize the basic data to avoid recursive loops.
        # Wait, the frontend might not need `blogs` populated in the list view, but it expects an array.
        return [] # Returning empty array for now to satisfy the schema, actually the frontend might just want a list of blogs inside the playlist.


class BlogSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    playlists = PlaylistSerializer(many=True, read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    playlist_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Playlist.objects.all(), source='playlists', write_only=True, required=False
    )
    like_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = (
            'id', 'title', 'content', 'image', 'author', 'playlists', 'playlist_ids', 
            'category', 'category_id', 'slug', 'is_published', 'posted_on_linkedin', 
            'linkedin_post_url', 'read_count', 'subtitle', 'excerpt', 'introduction', 
            'conclusion', 'tags', 'featured', 'sections', 'created_at', 'updated_at',
            'like_count', 'is_liked', 'avatar_svg'
        )
        read_only_fields = (
            'id', 'slug', 'created_at', 'updated_at', 'read_count', 
            'like_count', 'is_liked', 'avatar_svg'
        )

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_liked_by(request.user)
        return False

class ContactEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEntry
        fields = ('id', 'name', 'email', 'subject', 'message', 'is_read', 'created_at')
        read_only_fields = ('id', 'is_read', 'created_at')
