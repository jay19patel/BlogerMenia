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
        queryset = Blog.objects.filter(isPublished=True).order_by('-publishedDate')
        
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
        
        # Filter by username
        username = self.request.query_params.get('username', None)
        if username:
            queryset = queryset.filter(author__username=username)

        return queryset

    def list(self, request, *args, **kwargs):
        # Maintain existing frontend pagination behavior (skip/limit)
        queryset = self.filter_queryset(self.get_queryset())
        
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
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
    
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
        return Playlist.objects.filter(is_public=True).order_by('-created_at')

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-playlists')
    def my_playlists(self, request):
        playlists = Playlist.objects.filter(owner=request.user).order_by('-created_at')
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='user/(?P<username>[^/.]+)')
    def user_playlists(self, request, username=None):
        try:
            user = User.objects.get(username=username)
            playlists = Playlist.objects.filter(owner=user, is_public=True).order_by('-created_at')
        except User.DoesNotExist:
            playlists = []
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] # Public profiles
    
    @action(detail=False, methods=['get'], url_path='profile/(?P<username>[^/.]+)')
    def profile(self, request, username=None):
        user = get_object_or_404(User, username=username)
        serializer = self.get_serializer(user)
        return Response(serializer.data)
