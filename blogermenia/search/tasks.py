"""Celery tasks for keeping the semantic search index fresh.

These replace the ad-hoc background threads that used to run embedding work.
Embedding hits Ollama (slow, network-bound, occasionally down), so it belongs on
a queue: the web request returns immediately and a worker does the real work,
retrying automatically if Ollama is unavailable.
"""
import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from . import constants as C
from .services import SearchService

logger = logging.getLogger(__name__)


def _model_for(kind):
    from blog.models import Blog, Playlist
    return {
        C.KIND_BLOG: Blog,
        C.KIND_PLAYLIST: Playlist,
        C.KIND_PROFILE: get_user_model(),
    }[kind]


# autoretry_for + backoff: if Ollama is down the task retries with exponential
# backoff (2s, 4s, 8s, ... capped) instead of silently losing the update.
@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=2,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=5,
)
def index_object(self, kind, pk):
    """(Re)build the embedding for a single object."""
    obj = _model_for(kind).objects.filter(pk=pk).first()
    if obj is None:
        logger.info("index_object: %s:%s no longer exists, skipping", kind, pk)
        return
    if not SearchService.index_object(kind, obj):
        # index_object swallows Ollama errors and returns False — turn that into a
        # real failure so the autoretry machinery kicks in.
        raise RuntimeError(f"Indexing failed for {kind}:{pk}")


@shared_task(ignore_result=True)
def remove_object(kind, pk):
    """Drop an object's embedding after it's deleted."""
    SearchService.remove_object(kind, pk)


@shared_task
def reindex_all(only_missing=False):
    """(Re)index everything. Used on startup, by beat, and by the mgmt command."""
    return SearchService.reindex_all(only_missing=only_missing)
