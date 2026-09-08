"""Settings entry point.

`DJANGO_SETTINGS_MODULE` stays `config.settings` everywhere; which environment
you get is chosen by `DJANGO_ENV` (`dev` by default, `prod` in production).
That keeps every entry point — manage.py, gunicorn, celery worker, celery beat —
pointed at the same module, so they can never disagree about the environment.
"""
import os

ENVIRONMENT = os.environ.get("DJANGO_ENV", "dev").lower()

if ENVIRONMENT == "prod":
    from .prod import *  # noqa: F401,F403
else:
    from .dev import *  # noqa: F401,F403
