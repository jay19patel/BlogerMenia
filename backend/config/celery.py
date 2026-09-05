"""Celery application for Blogermenia.

The single Celery instance for the project. It reads its configuration from Django
settings (every ``CELERY_*`` setting) and autodiscovers each app's ``tasks.py``.
"""
import os

from celery import Celery

# Make sure Django settings are importable before the app is built.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")

# Pull config from Django settings using the CELERY_ namespace, e.g.
# CELERY_BROKER_URL -> broker_url.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Find tasks.py in every installed app.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Quick sanity check: `celery -A blogermenia call blogermenia.celery.debug_task`."""
    print(f"Request: {self.request!r}")
