"""
GCS Storage — handles Google Cloud Storage uploads and PIL-based image compression.
"""
from __future__ import annotations

from io import BytesIO
import logging
import os

from google.cloud import storage
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

_storage_client: storage.Client | None = None


def get_gcs_client() -> storage.Client | None:
    """Singleton helper to construct the GCS Storage Client."""
    global _storage_client
    if _storage_client is not None:
        return _storage_client

    try:
        key_path = settings.gcs_credentials_path
        if key_path and key_path.exists():
            _storage_client = storage.Client.from_service_account_json(str(key_path))
            logger.info("GCS Storage client initialized from %s.", key_path)
        else:
            logger.info("GCS credentials file not configured; using application default credentials.")
            _storage_client = storage.Client()
    except Exception as exc:
        logger.error("Failed to initialize Google Cloud Storage Client: %s", exc, exc_info=True)
        _storage_client = None

    return _storage_client


def compress_image(image_bytes: bytes, max_size_kb: int = 400, max_width_height: int = 720) -> bytes:
    """
    Compresses an incoming image using Pillow:
    1. Resizes while preserving aspect ratio if dimensions exceed max_width_height.
    2. Converts color space to RGB (stripping transparency for JPEG saving).
    3. Optimizes and saves as a JPEG with variable quality targeting < max_size_kb.
    """
    try:
        img = Image.open(BytesIO(image_bytes))

        # Convert palette/RGBA modes to RGB for JPEG formatting
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize image keeping aspect ratio
        if img.width > max_width_height or img.height > max_width_height:
            img.thumbnail((max_width_height, max_width_height), Image.Resampling.LANCZOS)

        quality = 85
        out_io = BytesIO()
        img.save(out_io, format="JPEG", quality=quality, optimize=True)

        # Iteratively compress further if the file is still larger than target size
        while out_io.tell() > max_size_kb * 1024 and quality > 30:
            quality -= 10
            out_io = BytesIO()
            img.save(out_io, format="JPEG", quality=quality, optimize=True)

        logger.info("Image compressed successfully: quality=%d, size=%.1fKB", quality, out_io.tell() / 1024)
        return out_io.getvalue()

    except Exception as exc:
        logger.warning("Failed to compress image (will upload raw bytes): %s", exc, exc_info=True)
        return image_bytes


def upload_to_gcs(file_bytes: bytes, gcs_path: str, content_type: str) -> str:
    """
    Uploads raw file bytes to the configured Google Cloud Storage bucket.
    Makes the blog public and returns the storage.googleapis.com public URL.
    """
    client = get_gcs_client()
    if not client:
        raise RuntimeError("Google Cloud Storage client is not initialized.")

    bucket_name = settings.gcs_bucket_name
    bucket = client.bucket(bucket_name)

    blob = bucket.blob(gcs_path)

    # Upload using simple non-resumable upload stream (ideal for small images)
    blob.upload_from_string(file_bytes, content_type=content_type)

    try:
        blob.make_public()
    except Exception as exc:
        logger.warning("Could not explicitly set public access for blog (it might inherit public permission): %s", exc)

    public_url = f"https://storage.googleapis.com/{bucket_name}/{gcs_path}"
    logger.info("File uploaded successfully to GCS: %s", public_url)
    return public_url


def save_locally(file_bytes: bytes, gcs_path: str) -> str:
    """
    Saves raw file bytes to the local filesystem under the 'uploads' folder.
    Returns the relative local path string.
    """
    full_path = os.path.join("uploads", gcs_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(file_bytes)
    logger.info("File saved locally: %s", full_path)
    return f"/uploads/{gcs_path}"
