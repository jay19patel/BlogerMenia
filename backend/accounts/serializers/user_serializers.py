from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    has_linkedin_oauth = serializers.SerializerMethodField()
    blog_count = serializers.SerializerMethodField()
    playlist_count = serializers.SerializerMethodField()
    saved_blog_ids = serializers.SerializerMethodField()
    liked_blog_ids = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'about', 'profile_picture', 'linkedin_url',
            'linkedin_connected', 'auto_post_to_linkedin',
            'avatar_svg', 'has_linkedin_oauth', 'date_joined',
            'blog_count', 'playlist_count', 'saved_blog_ids', 'liked_blog_ids'
        )
        read_only_fields = ('id', 'linkedin_connected', 'avatar_svg', 'date_joined')

    def get_has_linkedin_oauth(self, obj):
        if hasattr(obj, 'has_linkedin_oauth'):
            return obj.has_linkedin_oauth()
        return False

    def get_blog_count(self, obj):
        if hasattr(obj, 'blogs'):
            return obj.blogs.filter(is_published=True).count()
        return 0

    def get_playlist_count(self, obj):
        if hasattr(obj, 'playlists'):
            return obj.playlists.count()
        return 0

    def get_saved_blog_ids(self, obj):
        if hasattr(obj, 'saved_blogs'):
            return list(obj.saved_blogs.values_list('id', flat=True))
        return []

    def get_liked_blog_ids(self, obj):
        if hasattr(obj, 'likes'):
            return list(obj.likes.values_list('blog_id', flat=True))
        return []

class UserRegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'password1', 'password2')

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        email = validated_data.get('email', '')
        # Generate a unique username from email
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password1']
        )
        return user
