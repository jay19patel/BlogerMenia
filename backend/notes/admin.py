from django.contrib import admin
from .models import Note

class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_public', 'total_likes', 'created_at')
    search_fields = ('title', 'user__username', 'tags')
    list_filter = ('is_public', 'created_at')
    readonly_fields = ('created_at', 'updated_at')

    def total_likes(self, obj):
        return obj.total_likes
    total_likes.short_description = 'Likes'

admin.site.register(Note, NoteAdmin)
