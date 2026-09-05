import logging
import os
import sys

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class SearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'search'

    def ready(self):
        # Register signal handlers that keep the index fresh.
        from . import signals  # noqa: F401
        from django.conf import settings

        if self._should_index_on_startup():
            # If tasks run eagerly, calling .delay() executes synchronously and hits
            # the database during app initialization, triggering a RuntimeWarning and
            # blocking startup.
            if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                logger.info("Search: skipping startup indexing because CELERY_TASK_ALWAYS_EAGER is True.")
            else:
                self._enqueue_startup_index()

    @staticmethod
    def _should_index_on_startup() -> bool:
        """Only when actually serving the site — not during migrate/test/shell/etc."""
        if 'runserver' not in sys.argv:
            return False
        # Under the autoreloader, run only in the worker process (RUN_MAIN=true).
        # With --noreload there is no worker, so run in the single process.
        return os.environ.get('RUN_MAIN') == 'true' or '--noreload' in sys.argv

    @staticmethod
    def _enqueue_startup_index():
        """Hand a 'reindex missing' job to Celery. Best-effort: if the broker
        isn't up yet, beat's periodic sweep will catch it — don't block boot."""
        try:
            from .tasks import reindex_all
            reindex_all.delay(only_missing=True)
            logger.info("Search: enqueued startup indexing (missing embeddings only)")
        except Exception:
            logger.warning("Search: could not enqueue startup indexing (broker down?)",
                           exc_info=True)
