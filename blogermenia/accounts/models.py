from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    bio = models.TextField(blank=True, max_length=500)
    about = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    linkedin_url = models.URLField(blank=True)
    linkedin_connected = models.BooleanField(default=False)
    saved_blogs = models.ManyToManyField('blog.Blog', related_name='saved_by', blank=True)

    def __str__(self):
        return self.username

    def has_linkedin_oauth(self):
        return self.socialaccount_set.filter(provider__startswith='linkedin').exists()

    @property
    def avatar_svg(self):
        from blog.utils import generate_avatar
        return generate_avatar(self.username, style_name="big-smile")
