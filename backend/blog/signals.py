"""Auto-fill blog excerpt/tags via Gemini when a post is saved without them."""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Blog
from . import tasks


@receiver(post_save, sender=Blog, dispatch_uid="blog_generate_metadata")
def blog_saved(sender, instance, **kwargs):
    if instance.excerpt and instance.tags:
        return
    transaction.on_commit(lambda: tasks.generate_blog_metadata.delay(instance.pk))
