from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from blog.models import Blog, Category, Playlist, Like
from blog.serializers import BlogSerializer, CategorySerializer, PlaylistSerializer, ContactEntrySerializer

class BlogListView(generics.ListCreateAPIView):
    queryset = Blog.objects.filter(is_published=True).select_related('author', 'category').prefetch_related('playlists')
    serializer_class = BlogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class BlogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Blog.objects.all().select_related('author', 'category').prefetch_related('playlists')
    serializer_class = BlogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.register_view(request)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class BlogLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug)
        like, created = Like.objects.get_or_create(blog=blog, user=request.user)
        if not created:
            like.delete()
            return Response({"liked": False, "like_count": blog.likes.count()})
        return Response({"liked": True, "like_count": blog.likes.count()})

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class PlaylistListView(generics.ListCreateAPIView):
    queryset = Playlist.objects.all().select_related('author')
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PlaylistDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Playlist.objects.all().select_related('author')
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

class ContactCreateView(generics.CreateAPIView):
    serializer_class = ContactEntrySerializer
    permission_classes = [AllowAny]

class BlogSaveToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug)
        user = request.user
        if hasattr(user, 'saved_blogs'):
            if user.saved_blogs.filter(id=blog.id).exists():
                user.saved_blogs.remove(blog)
                saved = False
            else:
                user.saved_blogs.add(blog)
                saved = True
            return Response({"saved": saved})
        return Response({"error": "Saved blogs not supported"}, status=status.HTTP_400_BAD_REQUEST)

class BlogShareLinkedInView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug, author=request.user)
        # Assuming we trigger a celery task or service for linkedin share here
        # For now, just mark it as posted or simulate success
        blog.posted_on_linkedin = True
        blog.save()
        return Response({"success": True})
