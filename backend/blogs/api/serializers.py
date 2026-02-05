from rest_framework import serializers
from blogs.models import Blog, Category
from users.api.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()



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
    image = serializers.ImageField(source='thumbnail', read_only=True)
    
    likes = serializers.IntegerField(read_only=True) # Property
    authorUsername = serializers.ReadOnlyField(source='author.username')
    category_name = serializers.ReadOnlyField(source='category.name')
    is_liked = serializers.SerializerMethodField()
    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'subtitle', 'slug', 'excerpt', 'introduction', 
            'sections', 'conclusion', 'author', 'authorUsername', 'category', 'category_name', 'category_id', 
            'thumbnail', 'image', 'isPublished', 'publishedDate', 'views', 'likes', 
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


