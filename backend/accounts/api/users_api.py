from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

from accounts.serializers import CurrentUserSerializer, PublicUserSerializer
from blog.models import Blog, Playlist
from blog.selectors import blog_queryset, playlist_queryset, user_queryset
from blog.serializers import BlogSerializer, PlaylistSummarySerializer
from core.permissions import IsOwnerOrReadOnly

User = get_user_model()


@extend_schema_view(get=extend_schema(summary="List members"))
class UserListView(generics.ListAPIView):
    serializer_class = PublicUserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    search_fields = ('username', 'first_name', 'last_name')
    ordering_fields = ('date_joined', 'username')
    ordering = ('-date_joined',)
    throttle_scope = 'read'

    def get_queryset(self):
        return user_queryset(User)


@extend_schema_view(
    get=extend_schema(summary="Read a profile"),
    patch=extend_schema(summary="Update your own profile"),
)
class UserDetailByUsernameView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    lookup_field = 'username'
    throttle_scope = 'read'

    def get_queryset(self):
        return user_queryset(User)

    def get_serializer_class(self):
        """Show yourself your private fields; show everyone else the public ones.

        Decided from the URL rather than the fetched object so it costs no
        extra query — and writes are only ever your own record anyway, because
        IsOwnerOrReadOnly rejects the rest.
        """
        user = self.request.user
        looking_at_self = (
            user.is_authenticated and user.username == self.kwargs.get('username')
        )
        if looking_at_self or self.request.method in ('PUT', 'PATCH'):
            return CurrentUserSerializer
        return PublicUserSerializer


@extend_schema_view(get=extend_schema(summary="A member's posts"))
class UserBlogsView(generics.ListAPIView):
    serializer_class = BlogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering = ('-created_at',)
    throttle_scope = 'read'
    queryset = Blog.objects.none()  # for schema generation only

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Blog.objects.none()
        author = get_object_or_404(User, username=self.kwargs['username'], is_active=True)
        queryset = blog_queryset(self.request).filter(author=author)
        # Your own profile shows your drafts; nobody else's does.
        if self.request.user.is_authenticated and self.request.user.pk == author.pk:
            return queryset
        return queryset.filter(is_published=True)


@extend_schema_view(get=extend_schema(summary="A member's playlists"))
class UserPlaylistsView(generics.ListAPIView):
    serializer_class = PlaylistSummarySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering = ('-created_at',)
    throttle_scope = 'read'
    queryset = Playlist.objects.none()  # for schema generation only

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Playlist.objects.none()
        author = get_object_or_404(User, username=self.kwargs['username'], is_active=True)
        return playlist_queryset().filter(author=author)


@extend_schema_view(get=extend_schema(summary="Your bookmarked posts"))
class SavedBlogsView(generics.ListAPIView):
    serializer_class = BlogSerializer
    permission_classes = [IsAuthenticated]
    ordering = ('-created_at',)
    throttle_scope = 'read'
    queryset = Blog.objects.none()  # for schema generation only

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Blog.objects.none()
        return blog_queryset(self.request).filter(
            saved_by=self.request.user, is_published=True
        )
