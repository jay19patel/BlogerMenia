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
        return self.username or self.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # Optimize profile image if exists
        if self.profile_image:
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
    content = models.JSONField()

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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
