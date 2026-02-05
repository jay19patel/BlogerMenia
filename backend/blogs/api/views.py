from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Sum, F
from django.shortcuts import get_object_or_404
from blogs.models import Blog, Category, Playlist, BlogLike, BlogView
from blogs.serializers import BlogSerializer, CategorySerializer, PlaylistSerializer, UserSerializer
from django.contrib.auth import get_user_model
User = get_user_model()

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class BlogViewSet(viewsets.ModelViewSet):
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = 'slug'

    def get_queryset(self):
        # Base queryset logic
        queryset = Blog.objects.all()
        
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
        # Drafts might have null publishedDate, so use created_at for consistency or coalesce
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
        
        # Filter by username (already handled implicitly above for drafts logic, but strictly enforce here for published path)
        if username_param:
             queryset = queryset.filter(author__username=username_param)

        return queryset

    # Removed manual list method to use DRF standard pagination
    # Note: Frontend might need adjustment if it relies on 'blogs' key instead of 'results'
    # Checking api.js is crucial.
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Track View
        track_view = request.query_params.get('track_view', 'true')
        
        if track_view != 'false':
            user = request.user if request.user.is_authenticated else None
            ip_addr = get_client_ip(request)
            
            # Optional: Debounce or check recent view to avoid spamming DB? 
            # For now, we log every hit as requested for granular tracking.
            BlogView.objects.create(user=user, blog=instance, ip_address=ip_addr)
            
            # Increment View Counter
            Blog.objects.filter(pk=instance.pk).update(views=F('views') + 1)
            
            # Refresh to get updated view count in response? Or just continue.
            # instance.refresh_from_db() 
            instance.views += 1 # Optimistic update for response
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-blogs')
    def my_blogs(self, request):
        queryset = Blog.objects.filter(author=request.user).order_by('-created_at')
        
        search = request.query_params.get('search', None)
        if search:
             queryset = queryset.filter(title__icontains=search)
            
        try:
            skip = int(request.query_params.get('skip', 0))
            limit = int(request.query_params.get('limit', 10))
        except ValueError:
             skip = 0
             limit = 10
             
        total = queryset.count()
        blogs = queryset[skip : skip + limit]
        
        serializer = self.get_serializer(blogs, many=True)
        return Response({
            'blogs': serializer.data,
            'total': total
        })

    @action(detail=False, methods=['get'], url_path=r'id/(?P<pk>\w+)')
    def get_by_id(self, request, pk=None):
        blog = get_object_or_404(Blog, pk=pk)
        
        # Track View (Duplicate logic or call self.retrieve logic?)
        # Since retrieve depends on lookup_field='slug', calling it with pk might be tricky without hacking kwargs.
        # Just duplicate logic here.
        user = request.user if request.user.is_authenticated else None
        ip_addr = get_client_ip(request)
        
        BlogView.objects.create(user=user, blog=blog, ip_address=ip_addr)
        Blog.objects.filter(pk=blog.pk).update(views=F('views') + 1)
        blog.views += 1
        
        serializer = self.get_serializer(blog)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='suggested_blogs')
    def suggested_blogs(self, request):
        limit = int(request.query_params.get('limit', 3))
        exclude_slug = request.query_params.get('exclude_slug', None)
        
        queryset = Blog.objects.filter(isPublished=True)
        if exclude_slug:
            queryset = queryset.exclude(slug=exclude_slug)
            
        # Basic suggestion: Random.
        # Future: Use embeddings or collaborative filtering (user likes/views).
        blogs = queryset.order_by('?')[:limit]
        
        serializer = self.get_serializer(blogs, many=True)
        return Response({'blogs': serializer.data})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        blog = self.get_object()
        user = request.user
        
        existing_like = BlogLike.objects.filter(user=user, blog=blog).first()
        
        if existing_like:
            existing_like.delete()
            # Decrement counter
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') - 1)
            status_msg = 'unliked'
            likes_count = max(0, blog.likes - 1)
        else:
            BlogLike.objects.create(user=user, blog=blog)
            # Increment counter
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') + 1)
            status_msg = 'liked'
            likes_count = blog.likes + 1
            
        return Response({'status': status_msg, 'total_likes': likes_count})

    @action(detail=False, methods=['get'])
    def categories(self, request):
        username = request.query_params.get('username', None)
        
        # Filter for categories that have at least one published blog
        qs = Category.objects.filter(blogs__isPublished=True)

        if username:
            qs = qs.filter(blogs__author__username=username)
            
        qs = qs.distinct()
        
        # Return simple list of names for frontend dropdowns
        # Frontend expects { categories: ["Name1", "Name2"] }
        category_names = list(qs.values_list('name', flat=True))
        
        return Response({'categories': category_names})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
         total_users = User.objects.count()
         total_blogs = Blog.objects.filter(isPublished=True).count()
         total_views = Blog.objects.filter(isPublished=True).aggregate(Sum('views'))['views__sum'] or 0
         
         return Response({
             'total_users': total_users,
             'total_blogs': total_blogs,
             'total_views': total_views
         })


class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = Playlist.objects.all()
        user = self.request.user
        
        if user.is_authenticated:
            # Authenticated users: See their own playlists (public or private) AND all other public playlists
            return queryset.filter(Q(is_public=True) | Q(owner=user)).distinct().order_by('-created_at')
        
        # Anonymous users: See only public playlists
        return queryset.filter(is_public=True).order_by('-created_at')

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-playlists')
    def my_playlists(self, request):
        playlists = Playlist.objects.filter(owner=request.user).order_by('-created_at')
        
        page = self.paginate_queryset(playlists)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='user/(?P<username>[^/.]+)')
    def user_playlists(self, request, username=None):
        try:
            user = User.objects.get(username=username)
            # Start with all playlists by this user
            playlists = Playlist.objects.filter(owner=user)
            
            # If viewer is not the owner, filter public only
            if request.user != user:
                playlists = playlists.filter(is_public=True)
                
            playlists = playlists.order_by('-created_at')
        except User.DoesNotExist:
            playlists = [] # Empty list or return generic response?
            
        # Treat empty list as QuerySet for pagination consistency if possible, or just return empty list
        if isinstance(playlists, list):
             # If it's a list (exception case), just return it (or wrap it manually)
             return Response([])

        page = self.paginate_queryset(playlists)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='blogs')
    def add_blog(self, request, slug=None):
        playlist = self.get_object()
        
        # Check ownership
        if playlist.owner != request.user:
            return Response({'error': 'You do not have permission to modify this playlist'}, status=status.HTTP_403_FORBIDDEN)
            
        blog_id = request.data.get('blog_id')
        if not blog_id:
            return Response({'error': 'Blog ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        blog = get_object_or_404(Blog, pk=blog_id)
        
        # Add blog if not already present
        if blog not in playlist.blogs.all():
            playlist.blogs.add(blog)
            
        return Response({'status': 'added', 'blog_count': playlist.blogs.count()})

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated], url_path='blogs/(?P<blog_id>\w+)')
    def remove_blog(self, request, slug=None, blog_id=None):
        playlist = self.get_object()
        
        # Check ownership
        if playlist.owner != request.user:
             return Response({'error': 'You do not have permission to modify this playlist'}, status=status.HTTP_403_FORBIDDEN)
             
        blog = get_object_or_404(Blog, pk=blog_id)
        
        if blog in playlist.blogs.all():
            playlist.blogs.remove(blog)
            
        return Response({'status': 'removed', 'blog_count': playlist.blogs.count()})


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] # Public profiles
    
    @action(detail=False, methods=['get'], url_path='profile/(?P<username>[^/.]+)')
    def profile(self, request, username=None):
        user = get_object_or_404(User, username=username)
        serializer = self.get_serializer(user)
        return Response(serializer.data)
