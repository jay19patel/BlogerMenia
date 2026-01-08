from django.db import models
from django.conf import settings

class Note(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=200)
    content = models.TextField()
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_notes', blank=True)
    
    # Optional: is_public field if we want to support private notes in the future.
    # For now, feed will likely show all notes.
    is_public = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    @property
    def total_likes(self):
        return self.likes.count()

    def get_tags_list(self):
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
