from django.db import models
from django.contrib.auth.models import AbstractUser
from PIL import Image
from django.utils.text import slugify
import datetime

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser with additional profile fields
    """
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    headline = models.CharField(max_length=255, null=True, blank=True, help_text="A short professional headline")
    bio = models.TextField(null=True, blank=True, help_text="Bio or about section")

    def __str__(self):
        return self.get_display_name()

    def get_display_name(self):
        """Return the best available display name"""
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.username or self.email.split('@')[0]

    def save(self, *args, **kwargs):
        # Check if profile_image has changed
        if self.pk:
            try:
                old_instance = User.objects.get(pk=self.pk)
                if old_instance.profile_image != self.profile_image:
                     self._process_image = True
                else:
                     self._process_image = False
            except User.DoesNotExist:
                # New user
                self._process_image = True
        else:
             self._process_image = True

        super().save(*args, **kwargs)

        # Optimize profile image if exists and flagged for processing
        if self.profile_image and getattr(self, '_process_image', False):
            try:
                img_path = self.profile_image.path
                with Image.open(img_path) as img:
                    # Resize image if it's too large
                    max_size = (400, 400)
                    if img.height > max_size[1] or img.width > max_size[0]:
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                        img.save(img_path, quality=85, optimize=True)
            except Exception as e:
                print(f"Error optimizing image: {e}")
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"


class FAQ(models.Model):
    question = models.CharField(max_length=200)
    answer = models.TextField()

    def __str__(self):
        return self.question    

class Testimonial(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()

    def __str__(self):
        return f"{self.user.username}'s Testimonial"

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
        User,
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
    
    # Counters
    views = models.IntegerField(default=0)
    likes = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Store embeddings as vector/list
    embedding = models.JSONField(default=list, blank=True, null=True, help_text="Mistral embeddings (1024 dim)")

    class Meta:
        ordering = ['-created_at']

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
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_likes')
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
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='viewed_blogs')
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='blog_views')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user or 'Anonymous'} viewed {self.blog}"


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
