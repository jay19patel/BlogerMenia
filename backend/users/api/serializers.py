from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(required=False, allow_null=True)
    blog_count = serializers.SerializerMethodField()
    total_views = serializers.SerializerMethodField()
    total_likes = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'profile_image', 'headline', 'bio', 'blog_count', 
            'total_views', 'total_likes', 'created_at', 'is_staff'
        ]
        read_only_fields = ['id', 'username', 'email', 'is_staff', 'created_at']

    def get_blog_count(self, obj):
        # Count published blogs
        if hasattr(obj, 'blogs'):
            return obj.blogs.filter(isPublished=True).count()
        return 0

    def get_total_views(self, obj):
        # Use annotated value if available (from TopAuthorsView)
        if hasattr(obj, 'total_views_count'):
            return obj.total_views_count
            
        # Fallback: Count all views from user's published blogs via BlogView model
        if hasattr(obj, 'blogs'):
            from blogs.models import BlogView
            return BlogView.objects.filter(
                blog__author=obj, blog__isPublished=True
            ).count()
        return 0

    def get_total_likes(self, obj):
        # Use annotated value if available
        if hasattr(obj, 'total_likes_count'):
            return obj.total_likes_count
            
        # Fallback: Count all likes from user's published blogs via BlogLike model
        if hasattr(obj, 'blogs'):
            from blogs.models import BlogLike
            return BlogLike.objects.filter(
                blog__author=obj, blog__isPublished=True
            ).count()
        return 0
