from rest_framework import serializers
from .models import Blog, Category, Playlist, User, BlogLike

class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'profile_image', 'headline', 'bio']

    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class BlogSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    is_liked = serializers.SerializerMethodField()
    thumbnail = serializers.ImageField(required=False)

    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'subtitle', 'slug', 'excerpt', 'introduction', 
            'sections', 'conclusion', 'author', 'category', 'category_id', 
            'thumbnail', 'isPublished', 'publishedDate', 'views', 'likes', 
            'created_at', 'updated_at', 'is_liked'
        ]
        read_only_fields = ['views', 'likes', 'author', 'slug', 'created_at', 'updated_at']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return BlogLike.objects.filter(user=request.user, blog=obj).exists()
        return False
    
    def create(self, validated_data):
        user = self.context['request'].user
        return Blog.objects.create(author=user, **validated_data)

class PlaylistSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    blogs = BlogSerializer(many=True, read_only=True)
    blog_ids = serializers.PrimaryKeyRelatedField(
        queryset=Blog.objects.all(), source='blogs', write_only=True, many=True, required=False
    )
    thumbnail = serializers.ImageField(required=False)

    class Meta:
        model = Playlist
        fields = ['id', 'owner', 'name', 'slug', 'description', 'thumbnail', 'blogs', 'blog_ids', 'is_public', 'created_at', 'updated_at']
        read_only_fields = ['owner', 'slug', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        blogs = validated_data.pop('blogs', [])
        playlist = Playlist.objects.create(owner=user, **validated_data)
        if blogs:
            playlist.blogs.set(blogs)
        return playlist
