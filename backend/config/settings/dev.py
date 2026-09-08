"""Local development settings."""
import os

from .base import *  # noqa: F401,F403
from .base import LOGGING, env_bool, env_list

DEBUG = True

# A throwaway key is fine here — prod.py refuses to start without a real one.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-dev-only-never-deploy-this")

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]", "testserver"]

# The Next.js dev server is the only browser-facing origin.
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# Prints emails to the terminal instead of sending them.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Milvus Lite locks the local database file, so Celery and Django cannot both
# hold it open. Running tasks eagerly keeps everything in the Django process.
# Set CELERY_TASK_ALWAYS_EAGER=false and use `manage.py dev` to exercise the
# real queue.
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", True)
CELERY_TASK_EAGER_PROPAGATES = False

# Locmem rather than Redis, so a developer without Redis running still gets a
# working cache and tests never share state between runs.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "blogermenia-dev",
    }
}

LOGGING["handlers"]["console"]["formatter"] = "simple"
