"""Auto-fill blog excerpt/tags via Gemini when a post is saved without them."""
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from core.cache import bump

from . import tasks
from .models import Blog, Category

# A save that touched none of these cannot have changed what the summary would
# say, so there is nothing to regenerate.
SUMMARISED_FIELDS = {
    'title', 'content', 'subtitle', 'introduction', 'conclusion', 'sections',
}


@receiver(post_save, sender=Blog, dispatch_uid="blog_generate_metadata")
def blog_saved(sender, instance, update_fields=None, **kwargs):
    if instance.excerpt and instance.tags:
        return
    if update_fields is not None and not (set(update_fields) & SUMMARISED_FIELDS):
        return

    # on_commit so the worker never races the transaction; `enqueue` so an
    # unreachable broker cannot 500 a request whose row is already committed.
    transaction.on_commit(
        lambda: tasks.enqueue(tasks.generate_blog_metadata, instance.pk)
    )


# --- cache invalidation ---------------------------------------------------
# `CategoryListView` is read on every page render and cached under a version
# key. Bumping the version here is what keeps a newly created category from
# taking an hour to appear.

@receiver([post_save, post_delete], sender=Category, dispatch_uid="bust_categories_on_category")
def category_changed(sender, **kwargs):
    bump('categories')


@receiver([post_save, post_delete], sender=Blog, dispatch_uid="bust_categories_on_blog")
def blog_changed(sender, **kwargs):
    # The category list carries per-category post counts.
    bump('categories')
