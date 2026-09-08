from django.core.cache import cache
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from blog.filters import PlaylistFilter
from blog.selectors import category_queryset, playlist_queryset
from blog.serializers import CategorySerializer, PlaylistSerializer, PlaylistSummarySerializer
from core.cache import cache_key
from core.mixins import OptimisticLockMixin
from core.permissions import IsAuthorOrReadOnly


@extend_schema_view(get=extend_schema(summary="List playlists"))
class PlaylistListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_class = PlaylistFilter
    search_fields = ('title', 'description')
    ordering_fields = ('created_at', 'title')
    ordering = ('-created_at',)

    @property
    def throttle_scope(self):
        return 'write' if self.request.method == 'POST' else 'read'

    def get_queryset(self):
        return playlist_queryset()

    def get_serializer_class(self):
        # The listing does not need every post of every playlist expanded.
        return PlaylistSerializer if self.request.method == 'POST' else PlaylistSummarySerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


@extend_schema_view(
    get=extend_schema(summary="Read a playlist and its posts"),
    patch=extend_schema(summary="Update a playlist (author only)"),
    delete=extend_schema(summary="Delete a playlist (author only)"),
)
class PlaylistDetailView(OptimisticLockMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    lookup_field = 'slug'
    throttle_scope = 'read'

    def get_queryset(self):
        return playlist_queryset()


@extend_schema_view(get=extend_schema(summary="List categories"))
class CategoryListView(generics.ListAPIView):
    """The category list, unpaginated and cached.

    Every page render asks for this to draw the sidebar, it is a handful of
    rows, and it changes when someone publishes under a new name — so it is
    cached with a version key that content saves bump, rather than a TTL that
    serves stale names.
    """

    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None
    throttle_scope = 'read'

    def get_queryset(self):
        return category_queryset()

    def list(self, request, *args, **kwargs):
        key = cache_key('categories')
        cached = cache.get(key)
        if cached is None:
            cached = self.get_serializer(self.filter_queryset(self.get_queryset()), many=True).data
            cache.set(key, cached, 60 * 60)
        return Response(cached)
