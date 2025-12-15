from django.db import models
from django.contrib.auth.models import AbstractUser
from PIL import Image
from django.utils.text import slugify
import datetime

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser with additional profile fields
    """
    # Additional profile fields
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    headline = models.CharField(max_length=255, null=True, blank=True, help_text="A short professional headline")
    bio = models.TextField(null=True, blank=True, help_text="Bio or about section")

    def __str__(self):
        # return self.username or self.email
        return self.get_display_name()

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
                img = Image.open(img_path)

                # Resize image if it's too large
                max_size = (400, 400)
                if img.height > max_size[1] or img.width > max_size[0]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    img.save(img_path, quality=85, optimize=True)
            except Exception as e:
                print(f"Error optimizing image: {e}")

    def get_profile_image_url(self):
        """Get the profile image URL or return a default"""
        if self.profile_image and hasattr(self.profile_image, 'url'):
            return self.profile_image.url
        return None

    def get_display_name(self):
        """Return the best available display name"""
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.username or self.email.split('@')[0]

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


class Blog(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True, null=True)
    slug = models.SlugField(unique=True, blank=True)

    excerpt = models.TextField(blank=True, null=True)
    introduction = models.TextField(blank=True, null=True)
    sections = models.JSONField()
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
        related_name="blogs"
    )

    thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    
    isPublished = models.BooleanField(default=False)
    publishedDate = models.DateTimeField(blank=True, null=True)
    views = models.IntegerField(default=0)
    likes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Store embeddings as vector/list
    embedding = models.JSONField(blank=True, null=True, help_text="Mistral embeddings (1024 dim)")

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

    def __str__(self):
        return f"{self.user.username} likes {self.blog.title}"


class Playlist(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='playlists')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(upload_to='playlist_thumbnails/', blank=True, null=True)
    blogs = models.ManyToManyField(Blog, related_name='playlists', blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
                pass
        else:
             self._process_thumbnail = True

        super().save(*args, **kwargs)

        # Optimize thumbnail if it exists
        if self.thumbnail and getattr(self, '_process_thumbnail', False):
            try:
                img = Image.open(self.thumbnail)
                max_size = (800, 800)
                if img.height > max_size[1] or img.width > max_size[0]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    if hasattr(self.thumbnail, 'path'):
                         img.save(self.thumbnail.path, quality=85, optimize=True)

            except Exception as e:
                # Fail silently or log error for image processing
                print(f"Error optimizing playlist thumbnail: {e}")

    def __str__(self):
        return self.name
