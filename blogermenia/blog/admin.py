from django.contrib import admin
from django.db.models import Count
from .models import Blog, Playlist, Like, Category, ContactEntry


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'color')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'created_at', 'updated_at')
    search_fields = ('title', 'author__username')
    list_filter = ('created_at', 'author')


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'is_published', 'read_count', 'like_count', 'created_at')
    list_filter = ('is_published', 'category', 'created_at', 'author')
    search_fields = ('title', 'content', 'author__username')
    filter_horizontal = ('playlists',)
    readonly_fields = ('read_count',)
    list_select_related = ('author', 'category')

    def get_queryset(self, request):
        # Annotate likes once for the whole changelist instead of a COUNT per row.
        return super().get_queryset(request).annotate(_like_count=Count('likes'))

    @admin.display(description='Likes', ordering='_like_count')
    def like_count(self, obj):
        return obj._like_count


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'blog', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'blog__title')


@admin.register(ContactEntry)
class ContactEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    list_editable = ('is_read',)
