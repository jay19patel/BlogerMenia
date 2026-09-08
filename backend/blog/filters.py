"""Filters for the blog list.

The frontend has always sent `category`, `author`, `tag`, `featured` and
`exclude`. Without a filter backend installed DRF dropped all of them silently,
so a category page rendered its heading over an unfiltered list of every post.
"""
import django_filters
from django.db.models import TextField
from django.db.models.functions import Cast

from blog.models import Blog, Playlist


class BlogFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='iexact')
    author = django_filters.CharFilter(field_name='author__username', lookup_expr='iexact')
    featured = django_filters.BooleanFilter(field_name='featured')
    playlist = django_filters.CharFilter(field_name='playlists__slug', lookup_expr='iexact')
    tag = django_filters.CharFilter(method='filter_tag')
    # "More like this" asks for related posts and must not return the post the
    # reader is already on.
    exclude = django_filters.CharFilter(field_name='slug', exclude=True, lookup_expr='iexact')

    class Meta:
        model = Blog
        fields = ('category', 'author', 'featured', 'tag', 'playlist', 'exclude')

    def filter_tag(self, queryset, name, value):
        """Match one tag inside the `tags` JSON list.

        JSONField's `contains` lookup is unsupported on SQLite, so this
        compares against the serialised text instead. The quotes matter: they
        anchor the match to a whole tag, so `tag=AI` does not also match
        "AI Safety".
        """
        return (
            queryset.annotate(_tags_text=Cast('tags', TextField()))
            .filter(_tags_text__icontains=f'"{value}"')
        )


class PlaylistFilter(django_filters.FilterSet):
    author = django_filters.CharFilter(field_name='author__username', lookup_expr='iexact')

    class Meta:
        model = Playlist
        fields = ('author',)
