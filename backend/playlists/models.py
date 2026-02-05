from django.db import models
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from PIL import Image
from blogs.models import Blog # Cross-app relationship

User = get_user_model()

class Playlist(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='playlists')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True, max_length=255)
    description = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(upload_to='playlist_thumbnails/', blank=True, null=True)
    
    blogs = models.ManyToManyField(Blog, related_name='playlists', blank=True)
    
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Playlist.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        # Check if thumbnail has changed
        if self.pk:
            try:
                old_instance = Playlist.objects.get(pk=self.pk)
                if old_instance.thumbnail != self.thumbnail:
                     self._process_thumbnail = True
                else:
                     self._process_thumbnail = False
            except Playlist.DoesNotExist:
                 self._process_thumbnail = True
        else:
             self._process_thumbnail = True

        super().save(*args, **kwargs)

        # Optimize thumbnail if it exists
        if self.thumbnail and getattr(self, '_process_thumbnail', False):
            try:
                img_path = self.thumbnail.path
                with Image.open(img_path) as img:
                    max_size = (800, 800)
                    if img.height > max_size[1] or img.width > max_size[0]:
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                        img.save(img_path, quality=85, optimize=True)

            except Exception as e:
                # Fail silently or log error for image processing
                print(f"Error optimizing playlist thumbnail: {e}")

    def __str__(self):
        return self.name
