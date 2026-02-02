from rest_framework import serializers
from .models import Blog, Category, Playlist, User

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

class CategorySerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField(read_only=True)

class BlogSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField()
    subtitle = serializers.CharField(required=False, allow_blank=True)
    slug = serializers.CharField(read_only=True)
    
    excerpt = serializers.CharField(required=False, allow_blank=True)
    introduction = serializers.CharField(required=False, allow_blank=True)
    sections = serializers.ListField(required=False)
    conclusion = serializers.CharField(required=False, allow_blank=True)
    
    author = UserSerializer(read_only=True)
    
    category = CategorySerializer(read_only=True)
    category_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    
    thumbnail = serializers.CharField(required=False, allow_null=True) # Expecting URL or Path string
    isPublished = serializers.BooleanField(default=False)
    publishedDate = serializers.DateTimeField(read_only=True)
    views = serializers.IntegerField(read_only=True)
    likes = serializers.IntegerField(read_only=True) # Property
    
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    is_liked = serializers.SerializerMethodField()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.id in obj.liked_by
        return False
    
    def create(self, validated_data):
        user = self.context['request'].user
        category_id = validated_data.pop('category_id', None)
        category = None
        if category_id:
            # Fetch category doc
            category = Category.objects.filter(id=category_id).first()
            
        blog = Blog(author_id=user.id, category=category, **validated_data)
        blog.save()
        return blog

    def update(self, instance, validated_data):
        category_id = validated_data.pop('category_id', None)
        if category_id:
            instance.category = Category.objects.filter(id=category_id).first()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class PlaylistSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    owner = UserSerializer(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField(read_only=True)
    description = serializers.CharField(required=False, allow_blank=True)
    thumbnail = serializers.CharField(required=False, allow_null=True)
    
    blogs = BlogSerializer(many=True, read_only=True)
    blog_ids = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    
    is_public = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        user = self.context['request'].user
        blog_ids = validated_data.pop('blog_ids', [])
        
        playlist = Playlist(owner_id=user.id, **validated_data)
        
        if blog_ids:
             # Fetch blogs
             blogs = list(Blog.objects.filter(id__in=blog_ids))
             playlist.blogs = blogs
        
        playlist.save()
        return playlist

    def update(self, instance, validated_data):
        blog_ids = validated_data.pop('blog_ids', None)
        if blog_ids is not None:
             blogs = list(Blog.objects.filter(id__in=blog_ids))
             instance.blogs = blogs
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        instance.save()
        return instance
