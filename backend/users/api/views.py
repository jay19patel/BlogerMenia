from rest_framework import generics, permissions
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth import get_user_model
from users.api.serializers import UserSerializer

User = get_user_model()

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or Update User Profile.
    Public Read: Anyone can view a profile by username.
    Private Update: Only the owner can update their profile.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        username = self.kwargs.get('username')
        # If requesting own profile/update, verify identity
        if self.request.method not in permissions.SAFE_METHODS:
            if self.request.user.username != username:
                 self.permission_denied(self.request)
        
        return get_object_or_404(User, username=username)


class UserDetailByIdView(generics.RetrieveAPIView):
    """
    Get User Profile by ID.
    Public Read-Only: For tooltips and quick lookups.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'pk'


class TopAuthorsView(generics.ListAPIView):
    """
    Get Top Authors suitable for homepage.
    Sorted by simplified metric (e.g. blog count or random for now, can be sophisticated later).
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Return top 3 authors based on TOTAL VIEWS
        # Aggregates views and likes from all their published blogs
        from django.db.models import Count, Sum
        from blogs.models import BlogView, BlogLike
        
        # We need to annotate users with the count of views on their blogs
        # Using subqueries or reverse relation filtering
        # Since BlogView has blog__author=user, we can count those
        
        return User.objects.annotate(
            published_blog_count=Count('blogs', filter=Q(blogs__isPublished=True)),
            # Use the properties or related sets if possible, but for sorting we need annotation
            # We can use the related_name 'viewed_blogs' if it pointed to user as AUTHOR, but it points to user as VIEWER.
            # So we rely on 'blogs' relation.
            
            # Summing the 'views' field on Blog model (which is now a property? Wait, I changed it to property in Step 250)
            # Ah, Step 250 changed `views` and `likes` on Blog to PROPERTIES.
            # Properties CANNOT be used in annotate/order_by directly in Django ORM.
            # I must aggregate from the related models (BlogView, BlogLike).
            
            # This is complex because we need to sum counts of related objects of related objects.
            # User -> Blog -> BlogView count
            
            # Alternative: Since we need this for valid sorting, let's look at the implementation.
            # Ideally, we should have kept the IntegerField counters for performance and just updated them.
            # But since they are dynamic properties now, we must use subqueries or efficient filtering.
            
            # Actually, standard Django annotation:
            # Count('blogs__blog_views') gives total views across all blogs?
            # Let's verify. User.blogs -> related name 'blogs'. Blog.blog_views -> related name 'blog_views'.
            # So Count('blogs__blog_views') should work for total views.
            
            total_views_count=Count('blogs__blog_views', filter=Q(blogs__isPublished=True)),
            total_likes_count=Count('blogs__blog_likes', filter=Q(blogs__isPublished=True))
            
        ).filter(published_blog_count__gt=0).order_by('-total_views_count')[:3]
