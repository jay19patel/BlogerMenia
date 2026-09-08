"""Settings shared by every environment.

Anything that differs between local development and production belongs in
`dev.py` or `prod.py`, not here. If you find yourself writing `if DEBUG` in this
file, the setting belongs in one of those two instead.
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# backend/config/settings/base.py -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")


def env(name: str, default: str = "") -> str:
    """A variable present but blank in `.env` means "unset", not "empty string".

    Without this, `SQLITE_PATH=` in .env silently leaves DATABASES["NAME"] empty
    and every request fails with ImproperlyConfigured.
    """
    return os.environ.get(name, "").strip() or default


def env_bool(name: str, default: bool = False) -> bool:
    return env(name, str(default)).lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


# --- Applications ---------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "core",
    "accounts",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "linkedin_oidc",
    "blog",
    "search",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Only the admin and allauth render templates; both ship their own.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# --- Database -------------------------------------------------------------
# SQLite everywhere. SQLITE_PATH points this at a named volume in prod; WAL
# mode + a busy timeout let web/worker/beat share the file without locking
# errors. Move to Postgres before the read volume justifies it.

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": env("SQLITE_PATH", str(BASE_DIR / "db.sqlite3")),
        "OPTIONS": {
            "timeout": 20,
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
        },
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.CustomUser"
SITE_ID = 1


# --- Auth -----------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = (
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
)

ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "none"

# Bypass the intermediate social login confirmation page (works for GET requests).
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_STORE_TOKENS = True
SOCIALACCOUNT_PROVIDERS = {
    "linkedin_oauth2": {"SCOPE": ["openid", "profile", "email", "w_member_social"]},
}

# The adapters redirect a finished LinkedIn dance at the frontend's handoff
# route instead of at Django, which renders no pages of its own.
ACCOUNT_ADAPTER = "accounts.adapters.AccountAdapter"
SOCIALACCOUNT_ADAPTER = "accounts.adapters.SocialAccountAdapter"

# "Connect LinkedIn" is a plain OAuth login as far as Django is concerned — the
# frontend authenticates with JWTs, so there is no Django session identifying
# who asked. Matching on the provider-verified email is what attaches LinkedIn
# to the existing account rather than creating a second one. Safe here because
# LinkedIn's OIDC userinfo only returns an email it has verified itself; do not
# extend this to a provider that does not.
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True

# LinkedIn's versioned REST API takes the version as a header on every call.
# Pinned rather than "latest": LinkedIn retires a version roughly yearly, and a
# floating version means the share breaks on their schedule, not ours.
LINKEDIN_API_VERSION = env("LINKEDIN_API_VERSION", "202405")

DEFAULT_FROM_EMAIL = "Inkwell <noreply@inkwell.dev>"

# Where the Next.js app is served. Used to build the public URL of a post for
# LinkedIn shares and canonical links — Django itself renders no blog pages.
FRONTEND_URL = env("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Django renders no pages of its own, so "/" — allauth's default landing after
# the LinkedIn callback — is a 404 here. Send people back to the Next.js app.
LOGIN_REDIRECT_URL = FRONTEND_URL + "/"
LOGOUT_REDIRECT_URL = FRONTEND_URL + "/"


# --- i18n / files ---------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
WHITENOISE_MANIFEST_STRICT = False

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # Content-hashed filenames + far-future cache headers, gzip/brotli at
    # collectstatic time.
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Upload limits. Anything larger than this is rejected before it reaches a view;
# `core.validators.validate_image` enforces the same ceiling per file so the
# error is a field error rather than a 400 from the request parser.
MAX_UPLOAD_SIZE_MB = int(env("MAX_UPLOAD_SIZE_MB", "5"))
DATA_UPLOAD_MAX_MEMORY_SIZE = (MAX_UPLOAD_SIZE_MB + 1) * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024


# --- Security defaults ----------------------------------------------------
# nginx sits in front in production and forwards this header, so Django knows
# the original request was HTTPS even though gunicorn only speaks HTTP.

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

CORS_ALLOW_CREDENTIALS = False  # the frontend authenticates with a bearer token


# --- Google Gemini --------------------------------------------------------

GOOGLE_API_KEY = env("GOOGLE_API_KEY")
GEMINI_EMBEDDING_MODEL = env("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
GEMINI_MODEL = env("GEMINI_MODEL", "gemini-2.5-flash")

# Semantic search index (Milvus Lite — a file, not a server).
MILVUS_URI = env("MILVUS_URI", str(BASE_DIR / "search" / "milvus.db"))


# --- Celery ---------------------------------------------------------------
# Dedicated Redis DBs (2 = broker, 3 = results) so this project never shares
# DB 0/1 with another Celery project on the same machine — otherwise workers
# steal and discard each other's tasks.

CELERY_BROKER_URL = env("CELERY_BROKER_URL", "redis://127.0.0.1:6379/2")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/3")

# JSON only — never pickle.
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# - late ack + reject-on-lost: a task re-runs if a worker dies mid-flight.
# - prefetch 1: fair dispatch for our slow, uneven embedding tasks.
# - result expiry: don't let Redis fill up with old task results.
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 200
CELERY_RESULT_EXPIRES = 60 * 60
CELERY_TASK_TIME_LIMIT = 300
CELERY_TASK_SOFT_TIME_LIMIT = 240
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_BEAT_SCHEDULE = {
    # Safety net behind real-time signal indexing: re-embed anything whose
    # embedding_status is not `indexed` (a failed task, a save that happened
    # while the broker was down).
    "reindex-pending-embeddings": {
        "task": "search.tasks.reindex_all",
        "schedule": 60 * 60 * 6,
        "kwargs": {"only_missing": True},
    },
    # Drop vectors whose backing row no longer exists — covers deletes that
    # happened while Milvus was unreachable.
    "prune-orphaned-embeddings": {
        "task": "search.tasks.prune_orphans",
        "schedule": 60 * 60 * 24,
    },
}


# --- Django REST Framework ------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.NamespaceVersioning",
    "DEFAULT_VERSION": "v1",
    "ALLOWED_VERSIONS": ["v1"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    # Scopes are attached per-view via `throttle_scope`. `login`, `register` and
    # `search` are the ones that cost real money or enable credential stuffing.
    "DEFAULT_THROTTLE_RATES": {
        "login": env("THROTTLE_LOGIN", "10/min"),
        "register": env("THROTTLE_REGISTER", "5/hour"),
        "contact": env("THROTTLE_CONTACT", "5/hour"),
        "search": env("THROTTLE_SEARCH", "30/min"),
        "write": env("THROTTLE_WRITE", "60/hour"),
        "read": env("THROTTLE_READ", "300/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    # Writing last_login on every token issue fires User.post_save, which used
    # to re-embed the profile on every login. The signal now diffs the indexed
    # fields, so this is safe to leave on.
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "BlogerMenia API",
    "DESCRIPTION": "Blogs, playlists, accounts and semantic search.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}


# --- Logging --------------------------------------------------------------
# Without this, every logger.error() in the service and task layer propagates
# to a root logger with no handler and is silently discarded in production.

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{levelname} {name}: {message}", "style": "{"},
        "verbose": {
            "format": "{asctime} {levelname} {name} {process:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.db.backends": {"level": "WARNING", "propagate": False},
        # Ours — the ones that report failed embeddings and failed shares.
        "blog": {"level": "INFO"},
        "search": {"level": "INFO"},
        "accounts": {"level": "INFO"},
        "core": {"level": "INFO"},
    },
}
