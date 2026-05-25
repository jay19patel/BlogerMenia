"""Normalise stored media object keys into browser-loadable public URLs."""
from __future__ import annotations

from typing import Any

from app.config import settings

MEDIA_FIELDS = {"attachment", "cover_image", "file_path", "image", "profile_image", "thumbnail"}


def normalise_media_paths(value: Any, field_name: str | None = None) -> Any:
    """Convert legacy GCS object keys in media fields to full public URLs."""
    if isinstance(value, dict):
        return {
            key: normalise_media_paths(item, field_name=key)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [normalise_media_paths(item, field_name=field_name) for item in value]
    if isinstance(value, str) and field_name in MEDIA_FIELDS:
        return public_media_url(value)
    return value


def public_media_url(path: str) -> str:
    """Return absolute URLs/local paths unchanged, expanding stored GCS keys."""
    if path.startswith(("http://", "https://", "data:", "/")):
        return path
    clean_path = path.lstrip("/")
    return f"https://storage.googleapis.com/{settings.gcs_bucket_name}/{clean_path}"
