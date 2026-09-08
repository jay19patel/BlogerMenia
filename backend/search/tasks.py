"""Celery tasks that keep the semantic search index fresh.

Embedding hits the Gemini API (network-bound, occasionally rate-limited or
down), so it belongs on a queue: the web request returns immediately and a
worker does the real work, retrying automatically when the failure is one that
retrying can fix. `core.tasks.RETRY_POLICY` is that policy, shared with every
other task in the project.
"""
import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from core.tasks import RETRY_POLICY, PermanentError

from . import constants as C
from .services import SearchService
from .services.indexing import record_failure, record_success, unchanged_since_last_index

logger = logging.getLogger(__name__)


def _model_for(kind):
    from blog.models import Blog, Playlist

    return {
        C.KIND_BLOG: Blog,
        C.KIND_PLAYLIST: Playlist,
        C.KIND_PROFILE: get_user_model(),
    }[kind]


def enqueue(task, *args, **kwargs) -> bool:
    """Hand a job to the broker without letting an outage break the request.

    These are dispatched from `transaction.on_commit`, so an exception here
    fires *after* the row is committed: the user would see a 500 for a save
    that actually succeeded, then retry and create a duplicate. Returning False
    instead lets the beat sweep pick the work up later.
    """
    try:
        task.delay(*args, **kwargs)
        return True
    except Exception:  # noqa: BLE001 — broker errors share no useful base class
        logger.warning("Could not enqueue %s%s (broker down?)", task.name, args, exc_info=True)
        return False


@shared_task(bind=True, **RETRY_POLICY)
def index_object(self, kind, pk):
    """(Re)build the embedding for a single object."""
    obj = _model_for(kind).objects.filter(pk=pk).first()
    if obj is None:
        logger.info("index_object: %s:%s no longer exists, skipping", kind, pk)
        return

    is_blog = kind == C.KIND_BLOG

    # A save that touched nothing the embedding is built from does not need a
    # (billed) round trip to Gemini.
    if is_blog and unchanged_since_last_index(obj):
        logger.info("index_object: blog:%s text unchanged, skipping re-embed", pk)
        return

    try:
        digest = SearchService.index_object(kind, obj)
    except PermanentError as exc:
        # Will fail identically every time — record it and stop, rather than
        # spending the full retry budget on it.
        logger.warning("index_object: %s:%s permanently unindexable: %s", kind, pk, exc)
        if is_blog:
            record_failure(pk, exc)
        return
    except Exception as exc:
        if is_blog:
            record_failure(pk, exc)
        raise  # TransientError — the retry policy takes it from here

    if is_blog:
        record_success(pk, digest)


@shared_task(**RETRY_POLICY)
def remove_object(kind, pk):
    """Drop an object's embedding after it is deleted.

    Retries like the indexing path: a delete lost to a brief Milvus outage
    leaves a vector with no backing row, and `_resolve` drops unloadable ids
    silently, so the orphan would never surface as an error.
    """
    SearchService.remove_object(kind, pk)


@shared_task
def reindex_all(only_missing=False):
    """(Re)index everything, or only what is missing or previously failed."""
    return SearchService.reindex_all(only_missing=only_missing)


@shared_task
def prune_orphans():
    """Delete vectors whose backing row is gone."""
    return SearchService.prune_orphans()
