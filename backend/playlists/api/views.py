from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth import get_user_model

from playlists.models import Playlist
from playlists.api.serializers import PlaylistSerializer
from blogs.models import Blog
from blogs.api.paginations import StandardResultsSetPagination

User = get_user_model()

# --- Playlist Views ---

class PlaylistListCreateView(generics.ListCreateAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Playlist.objects.all()
        user = self.request.user
        
        if user.is_authenticated:
            # Authenticated: Own playlists + Public playlists
            return queryset.filter(Q(is_public=True) | Q(owner=user)).distinct().order_by('-created_at')
        
        # Anonymous: Public only
        return queryset.filter(is_public=True).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PlaylistDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Playlist.objects.all()
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'


class MyPlaylistsView(generics.ListAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Playlist.objects.filter(owner=self.request.user).order_by('-created_at')


class UserPlaylistsView(generics.ListAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        username = self.kwargs.get('username')
        if not username:
             return Playlist.objects.none()
             
        try:
            target_user = User.objects.get(username=username)
            # Show all if owner is viewer, else only public
            if self.request.user == target_user:
                 return Playlist.objects.filter(owner=target_user).order_by('-created_at')
            else:
                 return Playlist.objects.filter(owner=target_user, is_public=True).order_by('-created_at')
        except User.DoesNotExist:
            return Playlist.objects.none()


class PlaylistBlogActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug=None):
        """Add blog to playlist"""
        playlist = get_object_or_404(Playlist, slug=slug)
        if playlist.owner != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        blog_id = request.data.get('blog_id')
        if not blog_id:
            return Response({'error': 'Blog ID required'}, status=status.HTTP_400_BAD_REQUEST)
            
        blog = get_object_or_404(Blog, pk=blog_id)
        if blog not in playlist.blogs.all():
            playlist.blogs.add(blog)
            
        return Response({'status': 'added', 'blog_count': playlist.blogs.count()})

    def delete(self, request, slug=None, blog_id=None):
        """Remove blog from playlist"""
        playlist = get_object_or_404(Playlist, slug=slug)
        if playlist.owner != request.user:
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        blog = get_object_or_404(Blog, pk=blog_id)
        if blog in playlist.blogs.all():
            playlist.blogs.remove(blog)
            
        return Response({'status': 'removed', 'blog_count': playlist.blogs.count()})
