from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    bio = models.TextField(blank=True, max_length=500)
    about = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    linkedin_url = models.URLField(blank=True)

    def __str__(self):
        return self.username

    def has_linkedin_oauth(self):
        return self.socialaccount_set.filter(provider='linkedin_oauth2').exists()
