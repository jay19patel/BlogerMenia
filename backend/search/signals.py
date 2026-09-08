"""Keep the search index fresh as content changes.

Embedding calls hit the Gemini API, so the work goes to Celery. Indexing is
scheduled on transaction commit — the user's save/delete request never waits on
Gemini, and the worker only ever sees committed rows.

Two things this has to get right that it previously did not: dispatching must
survive a broker outage (an exception inside an on_commit hook 500s a request
whose row is already saved), and a save that changed nothing the embedding is
built from must not pay for a re-embedding.
"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from blog.models import Blog, Playlist

from . import constants as C
from . import tasks

logger = logging.getLogger(__name__)
User = get_user_model()

# Saving any of these means the object's indexed text may have changed. A save
# that touched only, say, `read_count` or `last_login` does not.
INDEXED_FIELDS = {
    C.KIND_BLOG: {
        'title', 'content', 'subtitle', 'excerpt', 'introduction', 'conclusion',
        'sections', 'category', 'category_id', 'is_published',
    },
    C.KIND_PLAYLIST: {'title', 'description'},
    C.KIND_PROFILE: {'username', 'first_name', 'last_name', 'bio', 'about', 'is_active'},
}


def _touches_index(kind, update_fields) -> bool:
    """`update_fields` is None for a plain save() — assume it changed something."""
    if update_fields is None:
        return True
    return bool(set(update_fields) & INDEXED_FIELDS[kind])


def _index(kind, pk):
    transaction.on_commit(lambda: tasks.enqueue(tasks.index_object, kind, pk))


def _remove(kind, pk):
    transaction.on_commit(lambda: tasks.enqueue(tasks.remove_object, kind, pk))


# dispatch_uid guarantees each receiver is connected exactly once, even if this
# module is imported more than once.
@receiver(post_save, sender=Blog, dispatch_uid="search_index_blog")
def blog_saved(sender, instance, update_fields=None, **kwargs):
    if _touches_index(C.KIND_BLOG, update_fields):
        _index(C.KIND_BLOG, instance.pk)


@receiver(post_save, sender=Playlist, dispatch_uid="search_index_playlist")
def playlist_saved(sender, instance, update_fields=None, **kwargs):
    if _touches_index(C.KIND_PLAYLIST, update_fields):
        _index(C.KIND_PLAYLIST, instance.pk)


@receiver(post_save, sender=User, dispatch_uid="search_index_profile")
def profile_saved(sender, instance, update_fields=None, **kwargs):
    # SIMPLE_JWT writes `last_login` on every token issue, which fires this. It
    # used to re-embed the whole profile each time somebody signed in.
    if _touches_index(C.KIND_PROFILE, update_fields):
        _index(C.KIND_PROFILE, instance.pk)


@receiver(post_delete, sender=Blog, dispatch_uid="search_remove_blog")
def blog_deleted(sender, instance, **kwargs):
    _remove(C.KIND_BLOG, instance.pk)


@receiver(post_delete, sender=Playlist, dispatch_uid="search_remove_playlist")
def playlist_deleted(sender, instance, **kwargs):
    _remove(C.KIND_PLAYLIST, instance.pk)


@receiver(post_delete, sender=User, dispatch_uid="search_remove_profile")
def profile_deleted(sender, instance, **kwargs):
    _remove(C.KIND_PROFILE, instance.pk)
