from rest_framework import serializers
from .models import Blog, Category, Playlist, User

class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'profile_image', 'headline', 'bio', 'blog_count', 'is_staff']

    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

    def get_blog_count(self, obj):
        return obj.blogs.filter(isPublished=True).count()

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
    
    sections = serializers.JSONField(required=False, default=list)
    thumbnail = serializers.ImageField(required=False, allow_null=True) 
    
    likes = serializers.IntegerField(read_only=True) # Property
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'subtitle', 'slug', 'excerpt', 'introduction', 
            'sections', 'conclusion', 'author', 'category', 'category_id', 
            'thumbnail', 'isPublished', 'publishedDate', 'views', 'likes', 
            'created_at', 'updated_at', 'is_liked'
        ]
        read_only_fields = ['id', 'slug', 'publishedDate', 'views', 'created_at', 'updated_at']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check BlogLike model (reverse relation 'blog_likes')
            return obj.blog_likes.filter(user=request.user).exists()
        return False
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['author'] = user
        return super().create(validated_data)

class PlaylistSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    blogs = BlogSerializer(many=True, read_only=True)
    blog_ids = serializers.PrimaryKeyRelatedField(
        queryset=Blog.objects.all(), source='blogs', write_only=True, many=True, required=False
    )
    thumbnail = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Playlist
        fields = [
            'id', 'owner', 'name', 'slug', 'description', 'thumbnail', 
            'blogs', 'blog_ids', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['owner'] = user
        return super().create(validated_data)
