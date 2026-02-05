from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Sum, F
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers

from blogs.models import Blog, Category, BlogLike, BlogView
from blogs.serializers import BlogSerializer, CategorySerializer
from users.serializers import UserSerializer
from blogs.api.paginations import StandardResultsSetPagination
from django.contrib.auth import get_user_model

User = get_user_model()

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# --- Blog Views ---

class BlogListCreateView(generics.ListCreateAPIView):
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Blog.objects.select_related('author', 'category').all()
        
        # Determine if we should show drafts (only if filtering by own username)
        username_param = self.request.query_params.get('username', None)
        viewer = self.request.user
        
        if username_param and viewer.is_authenticated and viewer.username == username_param:
            # Viewing own profile: Filter by author only (show drafts + published)
            queryset = queryset.filter(author=viewer)
        else:
            # Public view: Show only published
            queryset = queryset.filter(isPublished=True)

        # Apply ordering
        queryset = queryset.order_by('-publishedDate', '-created_at')
        
        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(subtitle__icontains=search) |
                Q(excerpt__icontains=search)
            )
        
        # Filter by category
        category_name = self.request.query_params.get('filter', None)
        if category_name and category_name != 'All' and category_name != 'featuredBlogs':
             queryset = queryset.filter(category__name=category_name)
        
        # Filter by username (for public profile views)
        if username_param and (not viewer.is_authenticated or viewer.username != username_param):
             queryset = queryset.filter(author__username=username_param)

        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class BlogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Track View
        track_view = request.query_params.get('track_view', 'true')
        
        if track_view != 'false':
            user = request.user if request.user.is_authenticated else None
            ip_addr = get_client_ip(request)
            
            # Create View Record
            BlogView.objects.create(user=user, blog=instance, ip_address=ip_addr)
            
            # Increment View Counter using F expression for atomicity
            Blog.objects.filter(pk=instance.pk).update(views=F('views') + 1)
            
            # Optimistic update for response
            instance.views += 1
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class BlogDetailByIdView(generics.RetrieveAPIView):
    """
    Retrieve blog by ID specifically (useful if slug changes or logic requires ID)
    """
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'pk'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Similar view tracking logic could apply here, but usually slug view is primary for frontend
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UserBlogListView(generics.ListAPIView):
    """
    'My Blogs' view - strictly for the authenticated user
    """
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Blog.objects.filter(author=self.request.user).order_by('-created_at')
        search = self.request.query_params.get('search', None)
        if search:
             queryset = queryset.filter(title__icontains=search)
        return queryset


class SuggestedBlogListView(generics.ListAPIView):
    serializer_class = BlogSerializer
    permission_classes = [permissions.AllowAny]
    
    # Cache suggestions for 5 minutes since they are random/heavy
    @method_decorator(cache_page(60 * 5))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        limit = int(self.request.query_params.get('limit', 3))
        exclude_slug = self.request.query_params.get('exclude_slug', None)
        
        queryset = Blog.objects.filter(isPublished=True)
        if exclude_slug:
            queryset = queryset.exclude(slug=exclude_slug)
            
        # Random ordering for suggestions
        return queryset.order_by('?')[:limit]


class BlogLikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug=None):
        blog = get_object_or_404(Blog, slug=slug)
        user = request.user
        
        existing_like = BlogLike.objects.filter(user=user, blog=blog).first()
        
        if existing_like:
            existing_like.delete()
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') - 1)
            status_msg = 'unliked'
            # fetch fresh value or calculate
            likes_count = max(0, blog.likes - 1)
        else:
            BlogLike.objects.create(user=user, blog=blog)
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') + 1)
            status_msg = 'liked'
            likes_count = blog.likes + 1
            
        return Response({'status': status_msg, 'total_likes': likes_count})


class CategoryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(cache_page(60 * 15)) # Cache for 15 mins
    def get(self, request, *args, **kwargs):
        username = request.query_params.get('username', None)
        qs = Category.objects.filter(blogs__isPublished=True)

        if username:
            qs = qs.filter(blogs__author__username=username)
            
        qs = qs.distinct()
        category_names = list(qs.values_list('name', flat=True))
        return Response({'categories': category_names})


class StatsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
         total_users = User.objects.count()
         total_blogs = Blog.objects.filter(isPublished=True).count()
         total_views = Blog.objects.filter(isPublished=True).aggregate(Sum('views'))['views__sum'] or 0
         
         return Response({
             'total_users': total_users,
             'total_blogs': total_blogs,
             'total_views': total_views
         })






