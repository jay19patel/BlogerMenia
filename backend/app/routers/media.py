"""
Media API router — uploads files/images to GCS with server-side PIL compression.
"""
from __future__ import annotations

import logging
import mimetypes
import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status

from app.deps import get_current_user
from app.config import settings
from app.models.blog import CurrentUser
from app.services.gcs_storage import compress_image, upload_to_gcs, save_locally

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/media", tags=["media"])


def process_and_upload_gcs_background(
    file_bytes: bytes,
    gcs_path: str,
    content_type: str,
    is_static_image: bool,
) -> None:
    """
    Synchronous background worker executed by FastAPI's thread pool.
    1. If static image, compresses it to JPEG using Pillow.
    2. Uploads raw or compressed bytes to GCS in production, or saves locally in development.
    """
    try:
        if is_static_image:
            logger.info("Compressing image server-side in background task: %r", gcs_path)
            file_bytes = compress_image(file_bytes)
            # Use jpeg as target compression format
            content_type = "image/jpeg"

        # Save locally or upload to GCS depending on the environment
        if settings.is_production:
            upload_to_gcs(file_bytes, gcs_path, content_type)
            logger.info("Background upload to GCS completed successfully: %r", gcs_path)
        else:
            save_locally(file_bytes, gcs_path)
            logger.info("Background local save completed successfully: %r", gcs_path)
    except Exception as exc:
        logger.error("Background task media storage failed for %r: %s", gcs_path, exc, exc_info=True)


@router.post("/upload/", summary="Upload compressed image to GCS")
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder: str = Form("general"),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads a file to Google Cloud Storage asynchronously using BackgroundTasks.
    Returns the predicted GCS public URL immediately while processing/uploading in the background.
    """
    logger.info("Upload request received: filename=%r, folder=%r, user=%r", file.filename, folder, current_user.email)

    try:
        # Read raw incoming bytes
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

        # Determine MIME type
        content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"

        # Unique filename + GCS path mapping
        original_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        is_static_image = content_type.startswith("image/") and "gif" not in content_type.lower()

        if is_static_image:
            # If we're converting static images to JPEG in background, set extension to .jpg
            unique_name = f"{folder}/{uuid.uuid4()}.jpg"
        else:
            unique_name = f"{folder}/{uuid.uuid4()}{original_ext}"

        gcs_path = unique_name

        if settings.is_production:
            bucket_name = settings.gcs_bucket_name
            public_url = f"https://storage.googleapis.com/{bucket_name}/{gcs_path}"
        else:
            public_url = f"{settings.next_public_api_url.rstrip('/')}/uploads/{gcs_path}"

        # Schedule the compression and upload as a background task
        background_tasks.add_task(
            process_and_upload_gcs_background,
            file_bytes,
            gcs_path,
            content_type,
            is_static_image,
        )

        logger.info("Scheduled media storage task in background for %r. Returning predicted URL: %s", gcs_path, public_url)

        return {
            "url": public_url,
            "public_id": gcs_path,
            "file_path": public_url,  # Matches frontend API client format
        }

    except Exception as exc:
        logger.error("Error scheduling file upload: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and schedule file upload: {exc}",
        )
