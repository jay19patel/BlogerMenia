"""
InteractionRepository — Mongo operations for the `likes` and `bookmarks`
collections. Both collections are keyed by (user_id, blog_id) with a
unique compound index enforced lazily on first write.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING

logger = logging.getLogger(__name__)

LIKES_COLLECTION = "likes"
BOOKMARKS_COLLECTION = "bookmarks"
BLOGS_COLLECTION = "blogs"


def _is_object_id(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-fA-F]{24}", str(value or "")))


def _to_oid(value: Any) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(str(value))


class InteractionRepository:
    """All read/write operations for likes & bookmarks."""

    _indexes_ready: bool = False

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._likes = db[LIKES_COLLECTION]
        self._bookmarks = db[BOOKMARKS_COLLECTION]
        self._blogs = db[BLOGS_COLLECTION]

    async def _ensure_indexes(self) -> None:
        """Create unique indexes the first time the repo is used."""
        if InteractionRepository._indexes_ready:
            return
        try:
            await self._likes.create_index(
                [("user_id", ASCENDING), ("blog_id", ASCENDING)],
                unique=True,
                name="uniq_user_blog_like",
            )
            await self._likes.create_index([("user_id", ASCENDING), ("created_at", -1)])
            await self._bookmarks.create_index(
                [("user_id", ASCENDING), ("blog_id", ASCENDING)],
                unique=True,
                name="uniq_user_blog_bookmark",
            )
            await self._bookmarks.create_index([("user_id", ASCENDING), ("updated_at", -1)])
            InteractionRepository._indexes_ready = True
        except Exception as exc:
            logger.warning("Failed to create interaction indexes: %s", exc)

    # ── Likes ─────────────────────────────────────────────────────────────────

    async def has_liked(self, user_id: str, blog_id: str) -> bool:
        await self._ensure_indexes()
        doc = await self._likes.find_one(
            {"user_id": _to_oid(user_id), "blog_id": _to_oid(blog_id)},
            {"_id": 1},
        )
        return doc is not None

    async def toggle_like(self, user_id: str, blog_id: str) -> Tuple[int, bool]:
        """Toggle a user's like on a blog. Returns (new_likes_count, has_liked)."""
        await self._ensure_indexes()
        user_oid = _to_oid(user_id)
        blog_oid = _to_oid(blog_id)
        now = datetime.now(timezone.utc)

        existing = await self._likes.find_one({"user_id": user_oid, "blog_id": blog_oid})

        if existing:
            await self._likes.delete_one({"_id": existing["_id"]})
            await self._blogs.update_one(
                {"_id": blog_oid},
                {"$inc": {"likes": -1}, "$pull": {"liked_by": user_oid}},
            )
            blog = await self._blogs.find_one({"_id": blog_oid}, {"likes": 1})
            count = max(0, int((blog or {}).get("likes", 0)))
            return count, False

        try:
            await self._likes.insert_one({
                "user_id": user_oid,
                "blog_id": blog_oid,
                "created_at": now,
            })
        except Exception:
            # Race: someone else inserted — treat as liked, fall through
            pass

        await self._blogs.update_one(
            {"_id": blog_oid},
            {"$inc": {"likes": 1}, "$addToSet": {"liked_by": user_oid}},
        )
        blog = await self._blogs.find_one({"_id": blog_oid}, {"likes": 1})
        count = max(0, int((blog or {}).get("likes", 0)))
        return count, True

    async def list_user_liked_blog_ids(self, user_id: str, limit: int = 50) -> List[str]:
        await self._ensure_indexes()
        cursor = self._likes.find(
            {"user_id": _to_oid(user_id)},
            {"blog_id": 1},
        ).sort("created_at", -1).limit(limit)
        return [str(doc["blog_id"]) async for doc in cursor]

    # ── Bookmarks ─────────────────────────────────────────────────────────────

    async def get_bookmark(self, user_id: str, blog_id: str) -> Optional[dict]:
        await self._ensure_indexes()
        doc = await self._bookmarks.find_one({
            "user_id": _to_oid(user_id),
            "blog_id": _to_oid(blog_id),
        })
        return self._serialise_bookmark(doc) if doc else None

    async def upsert_bookmark(
        self,
        user_id: str,
        blog_id: str,
        section_id: str,
        section_title: Optional[str],
    ) -> dict:
        await self._ensure_indexes()
        user_oid = _to_oid(user_id)
        blog_oid = _to_oid(blog_id)
        now = datetime.now(timezone.utc)

        await self._bookmarks.update_one(
            {"user_id": user_oid, "blog_id": blog_oid},
            {
                "$set": {
                    "section_id": section_id,
                    "section_title": section_title,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "user_id": user_oid,
                    "blog_id": blog_oid,
                    "created_at": now,
                },
            },
            upsert=True,
        )
        doc = await self._bookmarks.find_one({"user_id": user_oid, "blog_id": blog_oid})
        return self._serialise_bookmark(doc)

    async def delete_bookmark(self, user_id: str, blog_id: str) -> bool:
        await self._ensure_indexes()
        result = await self._bookmarks.delete_one({
            "user_id": _to_oid(user_id),
            "blog_id": _to_oid(blog_id),
        })
        return result.deleted_count > 0

    async def list_user_bookmarks(self, user_id: str, limit: int = 20) -> List[dict]:
        """Return a list of bookmarks with blog metadata populated for display."""
        await self._ensure_indexes()
        user_oid = _to_oid(user_id)

        pipeline = [
            {"$match": {"user_id": user_oid}},
            {"$sort": {"updated_at": -1}},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": BLOGS_COLLECTION,
                    "localField": "blog_id",
                    "foreignField": "_id",
                    "as": "blog",
                }
            },
            {"$unwind": {"path": "$blog", "preserveNullAndEmptyArrays": False}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "blog.author",
                    "foreignField": "_id",
                    "as": "author",
                }
            },
            {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},
        ]

        docs = []
        async for raw in self._bookmarks.aggregate(pipeline):
            blog = raw.get("blog") or {}
            author = raw.get("author") or {}
            docs.append({
                "id": str(raw["_id"]),
                "blog_id": str(raw["blog_id"]),
                "section_id": raw.get("section_id"),
                "section_title": raw.get("section_title"),
                "created_at": raw.get("created_at"),
                "updated_at": raw.get("updated_at"),
                "blog_slug": blog.get("slug"),
                "blog_title": blog.get("title"),
                "blog_thumbnail": blog.get("thumbnail") or blog.get("image"),
                "blog_excerpt": blog.get("excerpt") or blog.get("subtitle"),
                "blog_category": blog.get("category_name"),
                "author_email": author.get("email"),
                "author_username": author.get("username"),
                "author_full_name": author.get("full_name"),
            })
        return docs

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _serialise_bookmark(doc: dict) -> dict:
        return {
            "id": str(doc["_id"]),
            "blog_id": str(doc["blog_id"]),
            "section_id": doc.get("section_id"),
            "section_title": doc.get("section_title"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        }
