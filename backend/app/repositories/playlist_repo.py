"""
PlaylistRepository — async Motor operations for the 'playlists' collection.
Mirrors the Playlist Mongoose model from the Next.js frontend exactly.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)

COLLECTION = "playlists"

OWNER_FIELDS = {"full_name": 1, "username": 1, "profile_image": 1}
BLOG_FIELDS = {"title": 1, "slug": 1, "thumbnail": 1, "views": 1}


def _is_oid(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-fA-F]{24}", value))


def _serialise(doc: dict) -> dict:
    if not doc:
        return doc
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, dict):
            out[k] = _serialise(v)
        elif isinstance(v, list):
            out[k] = [
                _serialise(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i)
                for i in v
            ]
        else:
            out[k] = v
    if "_id" in out:
        out["id"] = out.pop("_id")
    return out


async def _populate(db: AsyncIOMotorDatabase, doc: dict) -> dict:
    if not doc:
        return doc

    # Populate owner
    owner_id = doc.get("owner")
    if owner_id and isinstance(owner_id, str):
        owner = await db["users"].find_one({"_id": ObjectId(owner_id)}, OWNER_FIELDS)
        if owner:
            doc["owner"] = _serialise(owner)

    # Populate blogs (list of ObjectId refs)
    blog_ids = doc.get("blogs", [])
    if blog_ids:
        populated_blogs = []
        for bid in blog_ids:
            if isinstance(bid, str) and _is_oid(bid):
                blog = await db["blogs"].find_one({"_id": ObjectId(bid)}, BLOG_FIELDS)
                if blog:
                    populated_blogs.append(_serialise(blog))
        doc["blogs"] = populated_blogs

    return doc


class PlaylistRepository:
    """All database operations for playlists."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._col = db[COLLECTION]

    # ── Queries ────────────────────────────────────────────────────────────────

    async def list_playlists(
        self,
        search: str = "",
        owner_id: str = "",
        is_public: Optional[bool] = None,
        blog_id: str = "",
        sort: str = "-createdAt",
        skip: int = 0,
        limit: int = 10,
    ) -> Tuple[int, List[dict]]:
        query: Dict[str, Any] = {}

        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        if owner_id:
            query["owner"] = ObjectId(owner_id) if _is_oid(owner_id) else owner_id
        if is_public is not None:
            query["is_public"] = is_public
        if blog_id:
            query["blogs"] = ObjectId(blog_id) if _is_oid(blog_id) else blog_id

        sort_field = "total_views" if sort in ("-views", "-total_views") else "createdAt"
        total = await self._col.count_documents(query)
        cursor = self._col.find(query).sort(sort_field, -1).skip(skip).limit(limit)

        docs = []
        async for doc in cursor:
            s = _serialise(doc)
            docs.append(await _populate(self._db, s))
        return total, docs

    async def get_by_id_or_slug(self, playlist_id: str) -> Optional[dict]:
        if _is_oid(playlist_id):
            doc = await self._col.find_one({"_id": ObjectId(playlist_id)})
        else:
            doc = await self._col.find_one({"slug": playlist_id})
        if not doc:
            return None
        return await _populate(self._db, _serialise(doc))

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(self, data: dict, owner_id: str) -> dict:
        name = (data.get("name") or data.get("title") or "").strip()
        if not name:
            raise ValueError("Playlist name is required")

        # Unique slug
        base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        slug = data.get("slug", "").strip() or base_slug
        counter = 1
        while await self._col.find_one({"slug": slug}):
            slug = f"{base_slug}-{counter}"
            counter += 1

        cover_image = data.get("cover_image") or data.get("thumbnail") or ""
        blogs = [
            ObjectId(b) for b in (data.get("blogs") or [])
            if isinstance(b, str) and _is_oid(b)
        ]

        doc = {
            "name": name,
            "slug": slug,
            "description": data.get("description", ""),
            "cover_image": cover_image,
            "is_public": data.get("is_public", True),
            "blogs": blogs,
            "blog_count": len(blogs),
            "total_views": 0,
            "total_likes": 0,
            "owner": ObjectId(owner_id),
        }
        result = await self._col.insert_one(doc)
        created = await self._col.find_one({"_id": result.inserted_id})
        return await _populate(self._db, _serialise(created))

    async def update(self, playlist_id: str, data: dict) -> dict:
        payload = {k: v for k, v in data.items() if k not in ("_id", "owner")}

        # Normalise thumbnail → cover_image
        if "thumbnail" in payload and "cover_image" not in payload:
            payload["cover_image"] = payload.pop("thumbnail")

        if "blogs" in payload:
            payload["blogs"] = [
                ObjectId(b) for b in payload["blogs"]
                if isinstance(b, str) and _is_oid(b)
            ]

        oid = ObjectId(playlist_id) if _is_oid(playlist_id) else None
        if oid is None:
            existing = await self._col.find_one({"slug": playlist_id})
            oid = existing["_id"] if existing else None
        if oid is None:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")

        await self._col.update_one({"_id": oid}, {"$set": payload})
        doc = await self._col.find_one({"_id": oid})
        return await _populate(self._db, _serialise(doc))

    async def delete(self, playlist_id: str) -> None:
        if _is_oid(playlist_id):
            await self._col.delete_one({"_id": ObjectId(playlist_id)})
        else:
            await self._col.delete_one({"slug": playlist_id})

    async def add_blog(self, playlist_id: str, blog_id: str) -> dict:
        blog = await self._db["blogs"].find_one({"_id": ObjectId(blog_id)})
        if not blog:
            raise NotFoundError(f"Blog {blog_id!r} not found")

        oid = ObjectId(playlist_id) if _is_oid(playlist_id) else None
        if oid is None:
            p = await self._col.find_one({"slug": playlist_id})
            oid = p["_id"] if p else None
        if oid is None:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")

        await self._col.update_one(
            {"_id": oid},
            {"$addToSet": {"blogs": ObjectId(blog_id)}},
        )
        # Keep blog_count in sync
        updated = await self._col.find_one({"_id": oid})
        await self._col.update_one({"_id": oid}, {"$set": {"blog_count": len(updated.get("blogs", []))}})
        return {"success": True, "message": "Blog added to playlist"}

    async def remove_blog(self, playlist_id: str, blog_id: str) -> dict:
        oid = ObjectId(playlist_id) if _is_oid(playlist_id) else None
        if oid is None:
            p = await self._col.find_one({"slug": playlist_id})
            oid = p["_id"] if p else None
        if oid is None:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")

        await self._col.update_one(
            {"_id": oid},
            {"$pull": {"blogs": ObjectId(blog_id) if _is_oid(blog_id) else blog_id}},
        )
        updated = await self._col.find_one({"_id": oid})
        await self._col.update_one({"_id": oid}, {"$set": {"blog_count": len(updated.get("blogs", []))}})
        return {"success": True, "message": "Blog removed from playlist"}

    async def increment_views(self, playlist_id: str) -> None:
        oid = ObjectId(playlist_id) if _is_oid(playlist_id) else None
        if oid:
            await self._col.update_one({"_id": oid}, {"$inc": {"total_views": 1}})
