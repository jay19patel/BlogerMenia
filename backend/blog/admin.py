from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html

from .models import Blog, Category, ContactEntry, EmbeddingStatus, Like, Playlist


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'color')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'created_at', 'updated_at')
    search_fields = ('title', 'author__username')
    list_filter = ('created_at', 'author')
    list_select_related = ('author',)


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'author', 'category', 'is_published', 'search_index',
        'read_count', 'like_count', 'created_at',
    )
    # embedding_status first: this is the page an operator opens when a post is
    # missing from search, and it used to be the page that could not tell them.
    list_filter = ('embedding_status', 'is_published', 'featured', 'category', 'created_at', 'author')
    search_fields = ('title', 'content', 'excerpt', 'author__username')
    filter_horizontal = ('playlists',)
    readonly_fields = ('read_count', 'embedding_status', 'embedding_error', 'embedded_at', 'embedding_hash')
    list_select_related = ('author', 'category')
    actions = ('reindex_selected',)

    def get_queryset(self, request):
        # Annotate likes once for the whole changelist instead of a COUNT per row.
        return super().get_queryset(request).annotate(_like_count=Count('likes'))

    @admin.display(description='Likes', ordering='_like_count')
    def like_count(self, obj):
        return obj._like_count

    @admin.display(description='Search index', ordering='embedding_status')
    def search_index(self, obj):
        colours = {
            EmbeddingStatus.INDEXED: '#2c6b4f',
            EmbeddingStatus.PENDING: '#8a5712',
            EmbeddingStatus.FAILED: '#a32b22',
            EmbeddingStatus.SKIPPED: '#6e7887',
        }
        label = obj.get_embedding_status_display()
        title = obj.embedding_error or ''
        return format_html(
            '<span style="color:{}" title="{}">{}</span>',
            colours.get(obj.embedding_status, '#6e7887'), title, label,
        )

    @admin.action(description="Re-index selected posts for search")
    def reindex_selected(self, request, queryset):
        from search import constants as C
        from search.tasks import enqueue, index_object

        queued = sum(
            1 for pk in queryset.values_list('pk', flat=True)
            if enqueue(index_object, C.KIND_BLOG, pk)
        )
        self.message_user(request, f"Queued {queued} post(s) for re-indexing.")


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'blog', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'blog__title')
    list_select_related = ('user', 'blog')


@admin.register(ContactEntry)
class ContactEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    list_editable = ('is_read',)
