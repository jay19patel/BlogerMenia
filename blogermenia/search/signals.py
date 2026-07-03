"""Keep the search index fresh as content changes.

Embedding calls hit Ollama, so we run them in a background thread on transaction
commit — the user's save/delete request never waits on the embedding.
"""
import logging
import threading

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from blog.models import Blog, Playlist
from . import constants as C
from .services import SearchService

logger = logging.getLogger(__name__)
User = get_user_model()


def _index_async(kind, pk):
    def _run():
        try:
            model = {
                C.KIND_BLOG: Blog,
                C.KIND_PLAYLIST: Playlist,
                C.KIND_PROFILE: User,
            }[kind]
            obj = model.objects.filter(pk=pk).first()
            if obj is not None:
                SearchService.index_object(kind, obj)
        except Exception:
            logger.exception(f"Background indexing failed for {kind}:{pk}")

    threading.Thread(target=_run, daemon=True).start()


def _schedule(kind, pk):
    transaction.on_commit(lambda: _index_async(kind, pk))


@receiver(post_save, sender=Blog)
def blog_saved(sender, instance, **kwargs):
    _schedule(C.KIND_BLOG, instance.pk)


@receiver(post_save, sender=Playlist)
def playlist_saved(sender, instance, **kwargs):
    _schedule(C.KIND_PLAYLIST, instance.pk)


@receiver(post_save, sender=User)
def profile_saved(sender, instance, **kwargs):
    _schedule(C.KIND_PROFILE, instance.pk)


@receiver(post_delete, sender=Blog)
def blog_deleted(sender, instance, **kwargs):
    SearchService.remove_object(C.KIND_BLOG, instance.pk)


@receiver(post_delete, sender=Playlist)
def playlist_deleted(sender, instance, **kwargs):
    SearchService.remove_object(C.KIND_PLAYLIST, instance.pk)


@receiver(post_delete, sender=User)
def profile_deleted(sender, instance, **kwargs):
    SearchService.remove_object(C.KIND_PROFILE, instance.pk)
