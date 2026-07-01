from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Add custom fields here if needed in the future
    # e.g., bio = models.TextField(blank=True)
    pass

    def __str__(self):
        return self.username
