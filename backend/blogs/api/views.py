from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from blogs.models import Blog, Category, Playlist, BlogLike
from blogs.serializers import BlogSerializer, CategorySerializer, PlaylistSerializer, UserSerializer

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
        category = self.request.query_params.get('filter', None)
        if category and category != 'All' and category != 'featuredBlogs':
             queryset = queryset.filter(category__name=category)
        
        # Filter by username
        username = self.request.query_params.get('username', None)
        if username:
            queryset = queryset.filter(author__username=username)

        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-blogs')
    def my_blogs(self, request):
        blogs = Blog.objects.filter(author=request.user).order_by('-created_at')
        
        # Apply search if present
        search = request.query_params.get('search', None)
        if search:
            blogs = blogs.filter(title__icontains=search)
            
        page = self.paginate_queryset(blogs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(blogs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='id/(?P<pk>\d+)')
    def get_by_id(self, request, pk=None):
        try:
            blog = Blog.objects.get(pk=pk)
            serializer = self.get_serializer(blog)
            return Response(serializer.data)
        except Blog.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='suggested_blogs')
    def suggested_blogs(self, request):
        limit = int(request.query_params.get('limit', 3))
        exclude_slug = request.query_params.get('exclude_slug', None)
        
        queryset = Blog.objects.filter(isPublished=True).order_by('?')
        if exclude_slug:
            queryset = queryset.exclude(slug=exclude_slug)
            
        blogs = queryset[:limit]
        serializer = self.get_serializer(blogs, many=True)
        # Frontend expects {blogs: []} structure sometimes or just array?
        # api.js: return result.blogs || []
        # So we should wrap it.
        return Response({'blogs': serializer.data})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        blog = self.get_object()
        like, created = BlogLike.objects.get_or_create(user=request.user, blog=blog)
        if not created:
            like.delete()
            blog.likes -= 1
            status = 'unliked'
        else:
            blog.likes += 1
            status = 'liked'
        blog.save()
        return Response({'status': status, 'total_likes': blog.likes})

    @action(detail=False, methods=['get'])
    def categories(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
         # This matches the frontend expectation
         from django.contrib.auth import get_user_model
         User = get_user_model()
         total_users = User.objects.count()
         total_blogs = Blog.objects.filter(isPublished=True).count()
         total_views = sum([b.views for b in Blog.objects.all()])
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

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_playlists(self, request):
        playlists = Playlist.objects.filter(owner=request.user).order_by('-created_at')
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='user/(?P<username>[^/.]+)')
    def user_playlists(self, request, username=None):
        playlists = Playlist.objects.filter(owner__username=username, is_public=True).order_by('-created_at')
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)
