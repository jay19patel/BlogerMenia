from rest_framework import permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from blogs.models import Blog, Category, Playlist
from blogs.serializers import BlogSerializer, CategorySerializer, PlaylistSerializer, UserSerializer
from utils.mongo import MongoEngineViewSet
import mongoengine 

class BlogViewSet(MongoEngineViewSet):
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = Blog.objects(isPublished=True).order_by('-publishedDate')
        
        # Search (regex for icontains)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                (mongoengine.Q(title__icontains=search) | 
                 mongoengine.Q(subtitle__icontains=search) |
                 mongoengine.Q(excerpt__icontains=search))
            )
        
        # Filter by category (ByName needs lookup)
        category_name = self.request.query_params.get('filter', None)
        if category_name and category_name != 'All' and category_name != 'featuredBlogs':
             # Find category doc first
             cat = Category.objects(name=category_name).first()
             if cat:
                 queryset = queryset.filter(category=cat)
             else:
                 return Blog.objects.none()
        
        # Filter by username
        username = self.request.query_params.get('username', None)
        if username:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(username=username)
                queryset = queryset.filter(author_id=user.id)
            except User.DoesNotExist:
                return Blog.objects.none()

        return queryset

    def list(self, request, *args, **kwargs):
        # We need to manually handle slicing for MongoEngine with limit/skip if we want efficient query
        # But queryset[skip:skip+limit] works.
        queryset = self.filter_queryset(self.get_queryset())
        
        try:
            skip = int(request.query_params.get('skip', 0))
            limit = int(request.query_params.get('limit', 10))
        except ValueError:
             skip = 0
             limit = 10

        total = queryset.count()
        blogs = list(queryset[skip : skip + limit])
        
        serializer = self.get_serializer(blogs, many=True)
        return Response({
            'blogs': serializer.data,
            'total': total
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-blogs')
    def my_blogs(self, request):
        blogs = Blog.objects(author_id=request.user.id).order_by('-created_at')
        
        search = request.query_params.get('search', None)
        if search:
             blogs = blogs.filter(title__icontains=search)
            
        page = self.paginate_queryset(list(blogs)) # Convert to list for pagination if standard pager
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(list(blogs), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'id/(?P<pk>\w+)') # pk in Mongo is ObjectId/String
    def get_by_id(self, request, pk=None):
        try:
            blog = Blog.objects.get(id=pk)
            serializer = self.get_serializer(blog)
            return Response(serializer.data)
        except Blog.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='suggested_blogs')
    def suggested_blogs(self, request):
        limit = int(request.query_params.get('limit', 3))
        exclude_slug = request.query_params.get('exclude_slug', None)
        
        # Random sampling in Mongo is hard. Using id gt/lt or just list? 
        # For small dataset, fetch all and sample python side.
        # Ideally use aggregate $sample.
        queryset = Blog.objects(isPublished=True)
        if exclude_slug:
            queryset = queryset.filter(slug__ne=exclude_slug)
            
        # Use aggregation for random sample
        pipeline = [{'$sample': {'size': limit}}]
        random_blogs = list(Blog.objects.aggregate(*pipeline))
        # Aggregation returns dicts, not Documents.
        # We need Documents for serializer (property methods).
        # Or simplistic manual dict response.
        # Better: just fetch first N for now or skip random.
        blogs = list(queryset[:limit])
        
        serializer = self.get_serializer(blogs, many=True)
        return Response({'blogs': serializer.data})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        blog = self.get_object()
        user_id = request.user.id
        
        if user_id in blog.liked_by:
            blog.liked_by.remove(user_id)
            status_msg = 'unliked'
        else:
            blog.liked_by.append(user_id)
            status_msg = 'liked'
            
        blog.save()
        return Response({'status': status_msg, 'total_likes': len(blog.liked_by)})

    @action(detail=False, methods=['get'])
    def categories(self, request):
        categories = list(Category.objects.all())
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
         from django.contrib.auth import get_user_model
         User = get_user_model()
         total_users = User.objects.count()
         total_blogs = Blog.objects(isPublished=True).count()
         # Sum views
         pipeline = [
             {'$group': {'_id': None, 'total_views': {'$sum': '$views'}}}
         ]
         res = list(Blog.objects.aggregate(*pipeline))
         total_views = res[0]['total_views'] if res else 0
         
         return Response({
             'total_users': total_users,
             'total_blogs': total_blogs,
             'total_views': total_views
         })


class PlaylistViewSet(MongoEngineViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        return Playlist.objects(is_public=True).order_by('-created_at')

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_playlists(self, request):
        playlists = list(Playlist.objects(owner_id=request.user.id).order_by('-created_at'))
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='user/(?P<username>[^/.]+)')
    def user_playlists(self, request, username=None):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(username=username)
            playlists = list(Playlist.objects(owner_id=user.id, is_public=True).order_by('-created_at'))
        except User.DoesNotExist:
            playlists = []
        serializer = self.get_serializer(playlists, many=True)
        return Response(serializer.data)
