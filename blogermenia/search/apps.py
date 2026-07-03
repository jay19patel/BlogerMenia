import logging
import os
import sys
import threading

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class SearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'search'

    def ready(self):
        # Register signal handlers that keep the index fresh.
        from . import signals  # noqa: F401

        if self._should_index_on_startup():
            self._start_background_index()

    @staticmethod
    def _should_index_on_startup() -> bool:
        """Only when actually serving the site — not during migrate/test/shell/etc."""
        if 'runserver' not in sys.argv:
            return False
        # Under the autoreloader, run only in the worker process (RUN_MAIN=true).
        # With --noreload there is no worker, so run in the single process.
        return os.environ.get('RUN_MAIN') == 'true' or '--noreload' in sys.argv

    @staticmethod
    def _start_background_index():
        def _run():
            try:
                from .services import SearchService
                SearchService.reindex_all(only_missing=True)
            except Exception:
                logger.exception("Startup search indexing failed")

        threading.Thread(target=_run, daemon=True).start()
        logger.info("Search: startup indexing scheduled (missing embeddings only)")
