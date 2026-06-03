"""
InteractionService — orchestrates likes & bookmarks on top of
InteractionRepository. Resolves blog by slug/id, busts caches.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.redis import blog_cache_key, cache_delete
from app.exceptions import NotFoundError
from app.repositories.blog_repo import BlogRepository
from app.repositories.interaction_repo import InteractionRepository

logger = logging.getLogger(__name__)


class InteractionService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._blogs = BlogRepository(db)
        self._repo = InteractionRepository(db)

    # ── Likes ─────────────────────────────────────────────────────────────────

    async def toggle_like(self, slug_or_id: str, user_id: str) -> Tuple[int, bool]:
        blog = await self._blogs.get_by_slug_or_id(slug_or_id)
        if not blog:
            raise NotFoundError(f"Blog {slug_or_id!r} not found")
        count, has_liked = await self._repo.toggle_like(user_id, blog["id"])
        await cache_delete(blog_cache_key(blog["slug"]))
        await cache_delete(blog_cache_key(blog["id"]))
        return count, has_liked

    async def has_liked(self, slug_or_id: str, user_id: str) -> bool:
        blog = await self._blogs.get_by_slug_or_id(slug_or_id)
        if not blog:
            return False
        return await self._repo.has_liked(user_id, blog["id"])

    async def list_user_liked_blog_ids(self, user_id: str, limit: int = 50) -> List[str]:
        return await self._repo.list_user_liked_blog_ids(user_id, limit=limit)

    # ── Bookmarks ─────────────────────────────────────────────────────────────

    async def get_blog_interaction(self, slug_or_id: str, user_id: str) -> dict:
        """Return both like state and bookmark for a single blog for the current user."""
        blog = await self._blogs.get_by_slug_or_id(slug_or_id)
        if not blog:
            raise NotFoundError(f"Blog {slug_or_id!r} not found")
        has_liked = await self._repo.has_liked(user_id, blog["id"])
        bookmark = await self._repo.get_bookmark(user_id, blog["id"])
        return {"has_liked": has_liked, "bookmark": bookmark}

    async def save_bookmark(
        self,
        slug_or_id: str,
        user_id: str,
        section_id: str,
        section_title: Optional[str],
    ) -> dict:
        blog = await self._blogs.get_by_slug_or_id(slug_or_id)
        if not blog:
            raise NotFoundError(f"Blog {slug_or_id!r} not found")
        return await self._repo.upsert_bookmark(user_id, blog["id"], section_id, section_title)

    async def remove_bookmark(self, slug_or_id: str, user_id: str) -> bool:
        blog = await self._blogs.get_by_slug_or_id(slug_or_id)
        if not blog:
            raise NotFoundError(f"Blog {slug_or_id!r} not found")
        return await self._repo.delete_bookmark(user_id, blog["id"])

    async def list_user_bookmarks(self, user_id: str, limit: int = 20) -> List[dict]:
        return await self._repo.list_user_bookmarks(user_id, limit=limit)
