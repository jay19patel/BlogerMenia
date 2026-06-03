"""
Embedding background jobs — scheduled via FastAPI BackgroundTasks so blog
create/update returns immediately instead of waiting on the Mistral round-trip.

Pattern mirrors `media.py`'s `process_and_upload_gcs_background`:
  1. The router responds to the client first.
  2. FastAPI runs the worker function after the response is sent.
  3. The worker re-fetches the doc from Mongo (it doesn't hold a reference to
     the dict the router built) so we always embed the latest state, even if
     another write landed between scheduling and execution.

The worker is async because both Motor (Mongo) and the Mistral SDK we use are
async — FastAPI handles async background tasks natively.
"""
from __future__ import annotations

import logging
from typing import Optional

from bson import ObjectId

from app.database.mongo import get_client
from app.config import settings
from app.services.embeddings import (
    build_blog_source_text,
    embed_text,
    hash_source_text,
    is_enabled as embeddings_enabled,
)
from app.services.vector_search import invalidate_cache as invalidate_vector_cache

logger = logging.getLogger(__name__)


async def embed_blog_in_background(blog_id: str) -> None:
    """Fetch the blog by id, generate its embedding, and persist it.

    Safe to call even when MISTRAL_API_KEY is unset (just logs and returns).
    Idempotent: skips work when the source-text hash already matches.
    Never raises — failures are logged so they're visible without bubbling
    up into the response cycle.
    """
    if not embeddings_enabled():
        logger.info("Embeddings disabled; skipping background embed for %s", blog_id)
        return

    try:
        oid = ObjectId(blog_id)
    except Exception as exc:
        logger.error("embed_blog_in_background: invalid blog_id %r (%s)", blog_id, exc)
        return

    try:
        db = get_client()[settings.mongodb_db]
        doc = await db["blogs"].find_one({"_id": oid})
        if not doc:
            logger.warning("embed_blog_in_background: blog %s not found", blog_id)
            return

        src = build_blog_source_text(doc)
        if not src:
            logger.info("embed_blog_in_background: empty source text for %s; skip", blog_id)
            return

        new_hash = hash_source_text(src)
        if doc.get("embedding") and doc.get("embedding_text_hash") == new_hash:
            logger.info("embed_blog_in_background: hash unchanged for %s; skip", blog_id)
            return

        vec: Optional[list[float]] = await embed_text(src)
        if vec is None:
            logger.warning("embed_blog_in_background: embed_text returned None for %s", blog_id)
            return

        await db["blogs"].update_one(
            {"_id": oid},
            {"$set": {"embedding": vec, "embedding_text_hash": new_hash}},
        )
        # The in-process vector-search cache is keyed by max updatedAt; we just
        # mutated a doc behind its back, so force a rebuild on the next query.
        invalidate_vector_cache()
        logger.info(
            "Embedded blog %s ('%s') in background (dim=%d)",
            blog_id, doc.get("title", "?"), len(vec),
        )
    except Exception as exc:
        logger.error(
            "embed_blog_in_background failed for %s: %s",
            blog_id, exc, exc_info=True,
        )
