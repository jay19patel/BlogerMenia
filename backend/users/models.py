from django.db import models
from django.contrib.auth.models import AbstractUser
from PIL import Image

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
