"""Backfill Mistral embeddings for every blog that doesn't have one (or whose
content has changed since the last embedding was generated).

Usage:
    uv run python scripts/backfill_embeddings.py
    uv run python scripts/backfill_embeddings.py --force         # rebuild all
    uv run python scripts/backfill_embeddings.py --batch-size 32

Requires MISTRAL_API_KEY in the environment (or .env). Safe to re-run.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings  # noqa: E402
from app.services.embeddings import (  # noqa: E402
    build_blog_source_text,
    embed_batch,
    hash_source_text,
    is_enabled as embeddings_enabled,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backfill_embeddings")


async def main(force: bool, batch_size: int) -> int:
    if not embeddings_enabled():
        logger.error("MISTRAL_API_KEY is not configured. Aborting.")
        return 2

    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    blogs = db["blogs"]

    total = await blogs.count_documents({})
    logger.info("Inspecting %d blog(s) in %s", total, settings.mongodb_db)

    cursor = blogs.find({}, projection=None)
    pending: list[tuple[str, str, str]] = []  # (id, source_text, new_hash)
    skipped = 0
    async for doc in cursor:
        src = build_blog_source_text(doc)
        if not src:
            continue
        new_hash = hash_source_text(src)
        if not force and doc.get("embedding") and doc.get("embedding_text_hash") == new_hash:
            skipped += 1
            continue
        pending.append((str(doc["_id"]), src, new_hash))

    logger.info("Skipping %d up-to-date, embedding %d", skipped, len(pending))
    if not pending:
        return 0

    # Process in our own batches so we can checkpoint progress every chunk.
    embedded = 0
    failed = 0
    for start in range(0, len(pending), batch_size):
        chunk = pending[start:start + batch_size]
        texts = [t for _, t, _ in chunk]
        try:
            vectors = await embed_batch(texts)
        except Exception as exc:
            logger.error("Batch starting at %d failed: %s", start, exc)
            failed += len(chunk)
            continue

        from bson import ObjectId
        for (blog_id, _, new_hash), vec in zip(chunk, vectors):
            if vec is None:
                failed += 1
                continue
            await blogs.update_one(
                {"_id": ObjectId(blog_id)},
                {"$set": {"embedding": vec, "embedding_text_hash": new_hash}},
            )
            embedded += 1
        logger.info("Progress: %d/%d embedded", embedded, len(pending))

    logger.info("Done. embedded=%d failed=%d skipped=%d", embedded, failed, skipped)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Re-embed every blog regardless of hash")
    parser.add_argument("--batch-size", type=int, default=settings.mistral_embed_batch_size)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(args.force, args.batch_size)))
