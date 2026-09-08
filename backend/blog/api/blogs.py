from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from blog.filters import BlogFilter
from blog.models import Blog, Like
from blog.selectors import blog_queryset, visible_blogs
from blog.serializers import BlogSerializer
from core.mixins import OptimisticLockMixin
from core.permissions import IsAuthorOrReadOnly


@extend_schema_view(
    get=extend_schema(summary="List published posts"),
    post=extend_schema(summary="Create a post"),
)
class BlogListView(generics.ListCreateAPIView):
    serializer_class = BlogSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_class = BlogFilter
    search_fields = ('title', 'subtitle', 'excerpt')
    ordering_fields = ('created_at', 'read_count', 'like_count_annotated')
    ordering = ('-created_at',)

    @property
    def throttle_scope(self):
        return 'write' if self.request.method == 'POST' else 'read'

    def get_queryset(self):
        queryset = blog_queryset(self.request)
        user = self.request.user

        # Authors need somewhere to find their own unpublished work, but the
        # public feed is not that place — so drafts are opt-in.
        wants_drafts = (
            user.is_authenticated
            and self.request.query_params.get('include_drafts') in ('1', 'true')
        )
        if wants_drafts:
            return queryset.filter(Q(is_published=True) | Q(author=user))
        return queryset.filter(is_published=True)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


@extend_schema_view(
    get=extend_schema(summary="Read a post"),
    patch=extend_schema(summary="Update a post (author only)"),
    put=extend_schema(summary="Replace a post (author only)"),
    delete=extend_schema(summary="Delete a post (author only)"),
)
class BlogDetailView(OptimisticLockMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BlogSerializer
    # IsAuthenticatedOrReadOnly alone only asks whether the caller is signed in.
    # Without IsAuthorOrReadOnly beside it, any account could edit or delete any
    # post on the site.
    permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    lookup_field = 'slug'
    throttle_scope = 'read'

    def get_queryset(self):
        return visible_blogs(self.request)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.register_view(request)
        return Response(self.get_serializer(instance).data)


class BlogLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'write'

    @extend_schema(summary="Like or unlike a post", request=None, responses={200: None})
    def post(self, request, slug):
        blog = get_object_or_404(Blog.objects.filter(is_published=True), slug=slug)
        like, created = Like.objects.get_or_create(blog=blog, user=request.user)
        if not created:
            like.delete()
        return Response({"liked": created, "like_count": blog.likes.count()})


class BlogSaveToggleView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'write'

    @extend_schema(summary="Bookmark or un-bookmark a post", request=None, responses={200: None})
    def post(self, request, slug):
        blog = get_object_or_404(Blog.objects.filter(is_published=True), slug=slug)
        saved_blogs = request.user.saved_blogs
        if saved_blogs.filter(pk=blog.pk).exists():
            saved_blogs.remove(blog)
            return Response({"saved": False})
        saved_blogs.add(blog)
        return Response({"saved": True})


class BlogShareLinkedInView(APIView):
    """Queue a real LinkedIn share.

    This used to set `posted_on_linkedin = True` and return success without
    dispatching anything, so the UI reported a share that never happened.
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = 'write'

    @extend_schema(summary="Share a post to the author's LinkedIn", request=None, responses={202: None})
    def post(self, request, slug):
        from accounts.tasks import queue_linkedin_post

        blog = get_object_or_404(Blog, slug=slug, author=request.user)

        if blog.posted_on_linkedin:
            return Response(
                {"detail": "Already shared.", "linkedin_post_url": blog.linkedin_post_url}
            )
        if not blog.is_published:
            return Response(
                {"detail": "Publish the post before sharing it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.has_linkedin_oauth():
            return Response(
                {"detail": "Connect your LinkedIn account first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not queue_linkedin_post(request.user.pk, blog.pk):
            return Response(
                {"detail": "Sharing is temporarily unavailable. Please try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"detail": "Sharing to LinkedIn. It will appear on the post shortly."},
            status=status.HTTP_202_ACCEPTED,
        )
