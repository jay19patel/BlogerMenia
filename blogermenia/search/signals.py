"""Keep the search index fresh as content changes.

Embedding calls hit Ollama, so we hand the work to Celery. Indexing is scheduled
on transaction commit — the user's save/delete request never waits on Ollama, and
the worker only ever sees committed rows.
"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from blog.models import Blog, Playlist
from . import constants as C
from . import tasks

logger = logging.getLogger(__name__)
User = get_user_model()


def _index(kind, pk):
    transaction.on_commit(lambda: tasks.index_object.delay(kind, pk))


def _remove(kind, pk):
    transaction.on_commit(lambda: tasks.remove_object.delay(kind, pk))


@receiver(post_save, sender=Blog)
def blog_saved(sender, instance, **kwargs):
    _index(C.KIND_BLOG, instance.pk)


@receiver(post_save, sender=Playlist)
def playlist_saved(sender, instance, **kwargs):
    _index(C.KIND_PLAYLIST, instance.pk)


@receiver(post_save, sender=User)
def profile_saved(sender, instance, **kwargs):
    _index(C.KIND_PROFILE, instance.pk)


@receiver(post_delete, sender=Blog)
def blog_deleted(sender, instance, **kwargs):
    _remove(C.KIND_BLOG, instance.pk)


@receiver(post_delete, sender=Playlist)
def playlist_deleted(sender, instance, **kwargs):
    _remove(C.KIND_PLAYLIST, instance.pk)


@receiver(post_delete, sender=User)
def profile_deleted(sender, instance, **kwargs):
    _remove(C.KIND_PROFILE, instance.pk)
