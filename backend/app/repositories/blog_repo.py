"""
BlogRepository — async Motor operations for the 'blogs' collection.
Mirrors the Blog Mongoose model from the Next.js frontend exactly.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions import NotFoundError
from app.services.media_urls import normalise_media_paths

logger = logging.getLogger(__name__)

COLLECTION = "blogs"

# Projection fields for author populate
AUTHOR_FIELDS = {
    "full_name": 1, "username": 1, "email": 1,
    "profile_image": 1, "headline": 1, "bio": 1,
    "blog_count": 1, "total_views": 1,
}

# Projection fields for category populate
CATEGORY_FIELDS = {"name": 1, "slug": 1}


def _is_object_id(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-fA-F]{24}", value))


def _serialise(doc: dict) -> dict:
    """Recursively convert ObjectId → str and datetime stays (Pydantic handles it)."""
    if not doc:
        return doc
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, dict):
            out[k] = _serialise(v)
        elif isinstance(v, list):
            out[k] = [_serialise(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        else:
            out[k] = v
    # Normalise _id → id
    if "_id" in out:
        out["id"] = out.pop("_id")
    if "publishedDate" in out and "published_date" not in out:
        out["published_date"] = out["publishedDate"]
    if "createdAt" in out and "created_at" not in out:
        out["created_at"] = out["createdAt"]
    if "updatedAt" in out and "updated_at" not in out:
        out["updated_at"] = out["updatedAt"]
    return out


async def _populate(db: AsyncIOMotorDatabase, doc: dict) -> dict:
    """Manually populate author and category references (Motor has no populate)."""
    if not doc:
        return doc

    # Populate author
    author_id = doc.get("author")
    if author_id:
        raw_id = ObjectId(author_id) if isinstance(author_id, str) else author_id
        author = await db["users"].find_one({"_id": raw_id}, AUTHOR_FIELDS)
        if author:
            doc["author"] = _serialise(author)
        else:
            doc["author"] = {"id": str(author_id)}

    # Populate category
    cat_id = doc.get("category")
    if cat_id:
        raw_id = ObjectId(cat_id) if isinstance(cat_id, str) else cat_id
        category = await db["categories"].find_one({"_id": raw_id}, CATEGORY_FIELDS)
        if category:
            doc["category"] = _serialise(category)
        else:
            doc["category"] = None

    return doc


class BlogRepository:
    """All database operations for blogs."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._col = db[COLLECTION]

    # ── Queries ────────────────────────────────────────────────────────────────

    async def list_blogs(
        self,
        search: str = "",
        category_name: str = "",
        author_id: str = "",
        exclude_slug: str = "",
        sort: str = "-createdAt",
        skip: int = 0,
        limit: int = 10,
    ) -> Tuple[int, List[dict]]:
        """Return (total_count, list_of_blog_dicts) with author+category populated."""
        query: Dict[str, Any] = {}

        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"excerpt": {"$regex": search, "$options": "i"}},
            ]

        if exclude_slug:
            query["slug"] = {"$ne": exclude_slug}

        if category_name and category_name != "All":
            cat = await self._db["categories"].find_one(
                {"name": re.compile(f"^{re.escape(category_name)}$", re.IGNORECASE)}
            )
            if cat:
                query["category"] = cat["_id"]
            else:
                return 0, []

        if author_id:
            query["author"] = ObjectId(author_id) if _is_object_id(author_id) else author_id

        sort_field = "views" if sort == "-views" else "createdAt"
        sort_direction = -1

        total = await self._col.count_documents(query)
        cursor = self._col.find(query).sort(sort_field, sort_direction).skip(skip).limit(limit)
        docs = []
        async for doc in cursor:
            serialised = _serialise(doc)
            populated = await _populate(self._db, serialised)
            docs.append(normalise_media_paths(populated))

        return total, docs

    async def get_by_slug_or_id(self, slug: str) -> Optional[dict]:
        """Find a blog by slug string or MongoDB ObjectId string."""
        if _is_object_id(slug):
            doc = await self._col.find_one({"_id": ObjectId(slug)})
        else:
            doc = await self._col.find_one({"slug": slug})

        if not doc:
            return None

        serialised = _serialise(doc)
        return normalise_media_paths(await _populate(self._db, serialised))

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(self, data: dict, author_id: str) -> dict:
        """Insert a new blog and return the full populated document."""
        # Build unique slug
        base_slug = re.sub(r"[^a-z0-9]+", "-", data["title"].lower()).strip("-")
        slug = base_slug
        counter = 1
        while await self._col.find_one({"slug": slug}):
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Merge flat content fields into content object
        content = data.pop("content", None) or {}
        if data.get("introduction") is not None:
            content["introduction"] = data.pop("introduction")
        if data.get("conclusion") is not None:
            content["conclusion"] = data.pop("conclusion")
        if data.get("sections") is not None:
            content["sections"] = data.pop("sections")

        # Resolve category ObjectId
        category_oid = None
        category_name = None
        if data.get("category"):
            cat_val = data["category"]
            if _is_object_id(cat_val):
                category_oid = ObjectId(cat_val)
                cat_doc = await self._db["categories"].find_one({"_id": category_oid}, CATEGORY_FIELDS)
            else:
                cat_doc = await self._db["categories"].find_one(
                    {"name": re.compile(f"^{re.escape(cat_val)}$", re.IGNORECASE)}
                )
                if cat_doc:
                    category_oid = cat_doc["_id"]
            if cat_doc:
                category_name = cat_doc["name"]

        now = datetime.now(timezone.utc)
        published_date = data.pop("publishedDate", None) or data.pop("published_date", None) or now

        insert_doc = {
            **{k: v for k, v in data.items() if k not in ("introduction", "conclusion", "sections")},
            "slug": slug,
            "content": content,
            "author": ObjectId(author_id),
            "category": category_oid,
            "category_name": category_name,
            "views": 0,
            "likes": 0,
            "featured": data.get("featured", False),
            "is_published": data.get("is_published", True),
            "publishedDate": published_date,
            "createdAt": now,
            "updatedAt": now,
        }

        result = await self._col.insert_one(insert_doc)

        # Increment author blog count
        await self._db["users"].update_one(
            {"_id": ObjectId(author_id)},
            {"$inc": {"blog_count": 1}},
        )

        doc = await self._col.find_one({"_id": result.inserted_id})
        return normalise_media_paths(await _populate(self._db, _serialise(doc)))

    async def update(self, blog_id: str, data: dict) -> dict:
        """Update blog fields and return the updated populated document."""
        update_dict: Dict[str, Any] = {}

        # Merge flat content fields
        intro = data.pop("introduction", None)
        concl = data.pop("conclusion", None)
        sects = data.pop("sections", None)

        if any(v is not None for v in (intro, concl, sects)):
            existing = await self._col.find_one({"_id": ObjectId(blog_id)})
            existing_content = (existing or {}).get("content", {})
            update_dict["content"] = {
                "introduction": intro if intro is not None else existing_content.get("introduction"),
                "conclusion": concl if concl is not None else existing_content.get("conclusion"),
                "sections": sects if sects is not None else existing_content.get("sections", []),
            }

        # Resolve category if provided
        if "category" in data and data["category"]:
            cat_val = data["category"]
            if _is_object_id(cat_val):
                data["category"] = ObjectId(cat_val)
                cat_doc = await self._db["categories"].find_one({"_id": data["category"]}, CATEGORY_FIELDS)
            else:
                cat_doc = await self._db["categories"].find_one(
                    {"name": re.compile(f"^{re.escape(cat_val)}$", re.IGNORECASE)}
                )
                data["category"] = cat_doc["_id"] if cat_doc else None
            data["category_name"] = cat_doc["name"] if cat_doc else None

        update_dict.update({k: v for k, v in data.items() if v is not None})

        update_dict["updatedAt"] = datetime.now(timezone.utc)

        await self._col.update_one({"_id": ObjectId(blog_id)}, {"$set": update_dict})
        doc = await self._col.find_one({"_id": ObjectId(blog_id)})
        return normalise_media_paths(await _populate(self._db, _serialise(doc)))

    async def delete(self, blog_id: str, author_id: str) -> None:
        """Delete a blog and decrement the author's blog_count."""
        await self._col.delete_one({"_id": ObjectId(blog_id)})
        await self._db["users"].update_one(
            {"_id": ObjectId(author_id)},
            {"$inc": {"blog_count": -1}},
        )

    async def increment_views(self, blog_id: str, author_id: Optional[str]) -> None:
        """Atomically increment views on blog and author."""
        await self._col.update_one({"_id": ObjectId(blog_id)}, {"$inc": {"views": 1}})
        if author_id:
            await self._db["users"].update_one(
                {"_id": ObjectId(author_id)},
                {"$inc": {"total_views": 1}},
            )

    async def toggle_like(self, blog_id: str, user_id: str) -> Tuple[int, bool]:
        """Toggle like for user. Returns (likes_count, has_liked_after_toggle)."""
        doc = await self._col.find_one({"_id": ObjectId(blog_id)})
        if not doc:
            raise NotFoundError(f"Blog {blog_id!r} not found")

        liked_by: List = doc.get("liked_by", [])
        user_oid = ObjectId(user_id) if _is_object_id(user_id) else user_id
        str_liked = [str(uid) for uid in liked_by]
        has_liked = user_id in str_liked

        if has_liked:
            await self._col.update_one(
                {"_id": ObjectId(blog_id)},
                {"$pull": {"liked_by": user_oid}, "$inc": {"likes": -1}},
            )
            new_count = max(0, doc.get("likes", 0) - 1)
            return new_count, False
        else:
            await self._col.update_one(
                {"_id": ObjectId(blog_id)},
                {"$addToSet": {"liked_by": user_oid}, "$inc": {"likes": 1}},
            )
            new_count = doc.get("likes", 0) + 1
            return new_count, True

    # ── Aggregates ────────────────────────────────────────────────────────────

    async def get_stats(self) -> dict:
        """Return platform-wide stats."""
        total_blogs = await self._col.count_documents({"is_published": True})
        agg = await self._col.aggregate([
            {"$match": {"is_published": True}},
            {"$group": {"_id": None, "totalViews": {"$sum": "$views"}}},
        ]).to_list(1)
        total_views = agg[0]["totalViews"] if agg else 0
        total_authors = await self._db["users"].count_documents({})
        return {
            "total_blogs": total_blogs,
            "total_views": total_views,
            "total_authors": total_authors,
        }
