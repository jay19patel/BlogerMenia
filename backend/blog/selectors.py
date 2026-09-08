"""Read-side queries.

Every list endpoint used to build its own queryset inline, and the serializers
then undid the `select_related` by issuing a `COUNT` per row for likes, an
`EXISTS` per row for "did I like this", and four more per nested author. These
builders annotate what the serializers read, so a page of posts is a fixed
handful of queries rather than one per row.
"""
from django.db.models import Count, Exists, OuterRef, Q

from blog.models import Blog, Category, Like, Playlist

# Nested authors render `has_linkedin_oauth`, which walks socialaccount.
_AUTHOR_PREFETCH = ('author__socialaccount_set',)


def blog_queryset(request=None):
    """Blogs with everything the serializer reads already loaded."""
    queryset = (
        Blog.objects
        .select_related('author', 'category')
        .prefetch_related('playlists__author__socialaccount_set', *_AUTHOR_PREFETCH)
        .annotate(like_count_annotated=Count('likes', distinct=True))
    )

    user = getattr(request, 'user', None)
    if user is not None and user.is_authenticated:
        queryset = queryset.annotate(
            is_liked_annotated=Exists(
                Like.objects.filter(blog=OuterRef('pk'), user=user)
            )
        )
    return queryset


def visible_blogs(request, *, include_own_drafts=True):
    """Published posts, plus the requester's own drafts.

    The detail view used to be `Blog.objects.all()`, which made every
    unpublished draft readable by anyone who could guess its slug — and slugs
    are derived from titles.
    """
    queryset = blog_queryset(request)
    user = getattr(request, 'user', None)

    if user is not None and user.is_authenticated:
        if user.is_staff:
            return queryset
        if include_own_drafts:
            return queryset.filter(Q(is_published=True) | Q(author=user))

    return queryset.filter(is_published=True)


def playlist_queryset():
    return (
        Playlist.objects
        .select_related('author')
        .prefetch_related(*_AUTHOR_PREFETCH)
        .annotate(blog_count_annotated=Count('blogs', distinct=True))
    )


def category_queryset():
    return Category.objects.annotate(
        blog_count_annotated=Count('blogs', filter=Q(blogs__is_published=True), distinct=True)
    )


def user_queryset(model):
    """Users with their profile counts annotated, for the directory and profiles."""
    return (
        model.objects.filter(is_active=True)
        .prefetch_related('socialaccount_set')
        .annotate(
            blog_count_annotated=Count(
                'blogs', filter=Q(blogs__is_published=True), distinct=True
            ),
            playlist_count_annotated=Count('playlists', distinct=True),
        )
    )
