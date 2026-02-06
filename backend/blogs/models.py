from django.db import models
from django.conf import settings
from django.utils.text import slugify
import datetime






class Category(models.Model):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Categories"


class Blog(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True, null=True)
    slug = models.SlugField(unique=True, blank=True, max_length=255)

    excerpt = models.TextField(blank=True, null=True)
    introduction = models.TextField(blank=True, null=True)
    # Flexible JSON structure
    sections = models.JSONField(default=list, blank=True)
    conclusion = models.TextField(blank=True, null=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blogs"
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blogs"
    )

    thumbnail = models.ImageField(upload_to='blog_thumbnails/', blank=True, null=True)
    
    isPublished = models.BooleanField(default=False)
    publishedDate = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Store embeddings as vector/list
    embedding = models.JSONField(default=list, blank=True, null=True, help_text="Mistral embeddings (1024 dim)")

    class Meta:
        ordering = ['-created_at']

    @property
    def likes(self):
        """Dynamic count of likes from BlogLike model."""
        return self.blog_likes.count()

    @property
    def views(self):
        """Dynamic count of views from BlogView model."""
        return self.blog_views.count()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        
        if self.isPublished and not self.publishedDate:
            self.publishedDate = datetime.datetime.now()
        elif not self.isPublished:
            self.publishedDate = None
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.slug



class BlogLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blog_likes')
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='blog_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'blog')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} likes {self.blog.title}"


class BlogView(models.Model):
    """
    Granular tracking of blog views.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='viewed_blogs')
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='blog_views')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user or 'Anonymous'} viewed {self.blog}"



