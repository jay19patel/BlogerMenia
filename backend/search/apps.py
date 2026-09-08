import logging
import os
import sys

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class SearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'search'

    def ready(self):
        # Register the signal handlers that keep the index fresh.
        from . import signals  # noqa: F401

        if self._should_index_on_startup():
            from django.conf import settings

            # Eager tasks run inline, which would hit the database during app
            # initialisation — a RuntimeWarning, and a blocked startup.
            if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                logger.info("Search: skipping startup indexing (CELERY_TASK_ALWAYS_EAGER).")
            else:
                self._enqueue_startup_index()

    @staticmethod
    def _should_index_on_startup() -> bool:
        """Only when actually serving the site — not during migrate/test/shell."""
        if 'runserver' not in sys.argv:
            return False
        # Under the autoreloader, run only in the worker process (RUN_MAIN=true).
        # With --noreload there is no worker, so run in the single process.
        return os.environ.get('RUN_MAIN') == 'true' or '--noreload' in sys.argv

    @staticmethod
    def _enqueue_startup_index():
        """Best-effort: if the broker isn't up yet, beat's periodic sweep will
        catch it — don't block boot."""
        from .tasks import enqueue, reindex_all

        if enqueue(reindex_all, only_missing=True):
            logger.info("Search: enqueued startup indexing (missing embeddings only)")
