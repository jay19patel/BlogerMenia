"""Production settings.

Every value that must not be guessable is required rather than defaulted — a
missing secret should stop the process at boot, not silently fall back to a
value that is published in this repository.
"""
import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import env_bool, env_list

DEBUG = False


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"{name} must be set when DJANGO_ENV=prod.")
    return value


SECRET_KEY = required("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be set when DJANGO_ENV=prod.")

# The browser only ever talks to the Next.js server, which calls this API from
# its own backend — so this list is normally empty. Populate it only if a
# browser really does need to reach Django cross-origin.
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

# --- TLS ---
# SECURE_SSL_REDIRECT stays off until TLS actually terminates in front of
# nginx; enabling it over plain HTTP puts every request in a redirect loop.
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
if SECURE_SSL_REDIRECT:
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# --- Email ---
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

# --- Cache ---
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("REDIS_CACHE_URL", "redis://127.0.0.1:6379/4"),
        "KEY_PREFIX": "bm",
    }
}

# Tasks always go through the broker in production.
CELERY_TASK_ALWAYS_EAGER = False
