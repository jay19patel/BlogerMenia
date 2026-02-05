from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(required=False, allow_null=True)
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'profile_image', 'headline', 'bio', 'blog_count', 'is_staff']
        read_only_fields = ['id', 'username', 'email', 'is_staff']

    def get_blog_count(self, obj):
        # We need to import Blog inside the method to avoid circular imports? 
        # Or better, rely on related_name 'blogs' if it exists. 
        # Assuming Blog model has author=ForeignKey(User, related_name='blogs')
        # But allow failures if 'blogs' relation isn't ready or mocked.
        if hasattr(obj, 'blogs'):
             return obj.blogs.filter(isPublished=True).count()
        return 0
