"""
CategoryRepository — async Motor operations for the 'categories' collection.
Mirrors the Category Mongoose model from the Next.js frontend.
"""
from __future__ import annotations

import logging
import re
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)

COLLECTION = "categories"


def _to_out(doc: dict) -> dict:
    """Normalise a raw MongoDB document into a serialisable dict."""
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    return doc


class CategoryRepository:
    """All database operations for categories."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[COLLECTION]

    async def list_all(self) -> List[dict]:
        """Return categories used by at least one published blog."""
        blog_col = self._col.database["blogs"]
        distinct_ids = await blog_col.distinct(
            "category",
            {"is_published": True, "category": {"$ne": None}},
        )
        cursor = self._col.find({"_id": {"$in": distinct_ids}}).sort("name", 1)
        return [_to_out(doc) async for doc in cursor]

    async def list_by_user(self, user_id: str) -> List[dict]:
        """Return categories used by a user identified by id, email, or username."""
        users_col = self._col.database["users"]
        blog_col = self._col.database["blogs"]

        if ObjectId.is_valid(user_id):
            author_id = ObjectId(user_id)
        else:
            user = await users_col.find_one(
                {
                    "$or": [
                        {"email": user_id},
                        {"username": user_id},
                    ]
                },
                {"_id": 1},
            )
            if not user:
                return []
            author_id = user["_id"]

        distinct_ids = await blog_col.distinct(
            "category",
            {"author": author_id, "is_published": True},
        )
        cursor = self._col.find({"_id": {"$in": distinct_ids}}).sort("name", 1)
        return [_to_out(doc) async for doc in cursor]

    async def get_or_create(self, name: str, slug: Optional[str] = None) -> dict:
        """
        Return existing category by name (case-insensitive) or create a new one.
        This is idempotent — safe to call concurrently.
        """
        pattern = re.compile(f"^{re.escape(name)}$", re.IGNORECASE)
        existing = await self._col.find_one({"name": pattern})
        if existing:
            return _to_out(existing)

        if not slug:
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

        result = await self._col.insert_one({"name": name, "slug": slug})
        doc = await self._col.find_one({"_id": result.inserted_id})
        return _to_out(doc)

    async def get_by_name(self, name: str) -> Optional[dict]:
        """Find one category by exact name (case-insensitive)."""
        pattern = re.compile(f"^{re.escape(name)}$", re.IGNORECASE)
        doc = await self._col.find_one({"name": pattern})
        return _to_out(doc) if doc else None
