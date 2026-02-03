from django.db import models
from django.conf import settings
import datetime

class Note(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=200)
    content = models.TextField(null=True, blank=True)
    tags = models.CharField(max_length=500, null=True, blank=True, help_text="Comma-separated tags")
    
    liked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_notes', blank=True)
    
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def total_likes(self):
        return self.liked_by.count()

    def get_tags_list(self):
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
