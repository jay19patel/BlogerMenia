from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Sum, F
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers

from blogs.models import Blog, Category, BlogLike, BlogView
from blogs.api.serializers import BlogSerializer, CategorySerializer
from users.api.serializers import UserSerializer
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
        
        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class BlogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Blog.objects.select_related('author', 'category').all()
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = 'slug'

    def get_object(self):
        obj = super().get_object()
        
        # Track view
        if self.request.method == 'GET':
            ip_address = get_client_ip(self.request)
            user = self.request.user if self.request.user.is_authenticated else None
            
            # Check if view already exists for this IP/user combo
            if user:
                exists = BlogView.objects.filter(blog=obj, user=user).exists()
            else:
                exists = BlogView.objects.filter(blog=obj, ip_address=ip_address, user__isnull=True).exists()
            
            if not exists:
                BlogView.objects.create(
                    blog=obj,
                    user=user,
                    ip_address=ip_address
                )
        
        return obj


class BlogDetailByIdView(generics.RetrieveAPIView):
    queryset = Blog.objects.select_related('author', 'category').all()
    serializer_class = BlogSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'pk'


class UserBlogListView(generics.ListAPIView):
    serializer_class = BlogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Blog.objects.filter(author=self.request.user).select_related('author', 'category').order_by('-created_at')


class SuggestedBlogListView(generics.ListAPIView):
    serializer_class = BlogSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Simple suggestion: Random published blogs
        return Blog.objects.filter(isPublished=True).select_related('author', 'category').order_by('?')[:10]


class BlogLikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug)
        user = request.user

        # Check if already liked
        like, created = BlogLike.objects.get_or_create(blog=blog, user=user)
        
        if not created:
            # Already liked, so unlike
            like.delete()
            liked = False
        else:
            liked = True

        return Response({
            'liked': liked,
            'total_likes': blog.likes
        })


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class StatsView(views.APIView):
    permission_classes = [permissions.AllowAny]  # Public endpoint for homepage

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
        # If user is authenticated, return their personal stats
        if request.user.is_authenticated:
            user = request.user
            user_blogs = Blog.objects.filter(author=user)
            
            total_blogs = user_blogs.count()
            published_blogs = user_blogs.filter(isPublished=True).count()
            draft_blogs = total_blogs - published_blogs
            
            total_views = BlogView.objects.filter(blog__author=user).count()
            total_likes = BlogLike.objects.filter(blog__author=user).count()
            
            serializer = UserSerializer(user, context={'request': request})
            
            return Response({
                'user': serializer.data,
                'stats': {
                    'total_blogs': total_blogs,
                    'published_blogs': published_blogs,
                    'draft_blogs': draft_blogs,
                    'total_views': total_views,
                    'total_likes': total_likes,
                }
            })
        else:
            # Public stats for homepage
            total_users = User.objects.count()
            total_blogs = Blog.objects.filter(isPublished=True).count()
            total_views = BlogView.objects.count()
            
            return Response({
                'total_users': total_users,
                'total_blogs': total_blogs,
                'total_views': total_views
            })


class ImageUploadView(generics.GenericAPIView):
    """
    Upload images for blog content
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile
            import uuid
            import os
            
            image_file = request.FILES['image']
            
            # Basic validation
            if not image_file.content_type.startswith('image/'):
                return Response(
                    {'error': 'Invalid file type. Only images are allowed.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if image_file.size > 5 * 1024 * 1024:  # 5MB limit
                return Response(
                    {'error': 'Image too large (max 5MB)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate unique filename
            ext = os.path.splitext(image_file.name)[1] or '.jpg'
            filename = f"blog_uploads/{uuid.uuid4().hex}{ext}"
            
            # Save file
            path = default_storage.save(filename, ContentFile(image_file.read()))
            url = default_storage.url(path)
            
            return Response({'url': url})
            
        except Exception as e:
            return Response(
                {'error': 'Upload failed. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
