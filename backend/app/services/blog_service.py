"""
BlogService — orchestrates blog operations with Redis cache invalidation.
Cache strategy:
  blogs:list:<hash>  TTL 60s  — busted on create / update / delete
  blog:<slug>        TTL 300s — busted on update / delete
  stats              TTL 120s — busted on create / delete
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.redis import (
    STATS_KEY, TTL_BLOG_DETAIL, TTL_BLOG_LIST, TTL_STATS,
    blog_cache_key, cache_delete, cache_delete_pattern, cache_get,
    cache_set, list_cache_key,
)
from app.exceptions import ForbiddenError, NotFoundError
from app.models.blog import CurrentUser
from app.repositories.blog_repo import BlogRepository

logger = logging.getLogger(__name__)


class BlogService:
    """All blog use-cases."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._repo = BlogRepository(db)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def list_blogs(
        self,
        search: str = "",
        category_name: str = "",
        author_id: str = "",
        exclude_slug: str = "",
        sort: str = "-createdAt",
        skip: int = 0,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Return paginated blog list, served from cache when possible."""
        params = dict(
            search=search, category_name=category_name, author_id=author_id,
            exclude_slug=exclude_slug, sort=sort, skip=skip, limit=limit,
        )
        key = list_cache_key(params)
        cached = await cache_get(key)
        if cached is not None:
            return cached

        total, blogs = await self._repo.list_blogs(**params)
        result = {
            "total": total,
            "blogs": blogs,
            "next": f"?skip={skip + limit}&limit={limit}" if skip + limit < total else None,
            "previous": f"?skip={max(0, skip - limit)}&limit={limit}" if skip > 0 else None,
        }
        await cache_set(key, result, TTL_BLOG_LIST)
        return result

    async def get_blog(self, slug: str, track_view: bool = True) -> dict:
        """Fetch a blog by slug or id, optionally incrementing its view count."""
        key = blog_cache_key(slug)

        # Only serve from cache when NOT tracking views (avoids stale counts)
        if not track_view:
            cached = await cache_get(key)
            if cached is not None:
                return cached

        blog = await self._repo.get_by_slug_or_id(slug)
        if not blog:
            raise NotFoundError(f"Blog {slug!r} not found")

        if track_view:
            author_id = None
            author = blog.get("author")
            if isinstance(author, dict):
                author_id = author.get("id")
            await self._repo.increment_views(blog["id"], author_id)
            blog["views"] = blog.get("views", 0) + 1
        else:
            await cache_set(key, blog, TTL_BLOG_DETAIL)

        return blog

    async def get_stats(self) -> dict:
        """Return platform stats, served from cache when possible."""
        cached = await cache_get(STATS_KEY)
        if cached is not None:
            return cached

        stats = await self._repo.get_stats()
        await cache_set(STATS_KEY, stats, TTL_STATS)
        return stats

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create_blog(self, data: dict, current_user: CurrentUser) -> dict:
        """Create blog and bust list + stats caches."""
        blog = await self._repo.create(data, current_user.id)
        await cache_delete_pattern("blogs:list:*")
        await cache_delete(STATS_KEY)
        return blog

    async def update_blog(
        self, slug: str, data: dict, current_user: CurrentUser
    ) -> dict:
        """Update a blog (author or admin only) and bust relevant caches."""
        existing = await self._repo.get_by_slug_or_id(slug)
        if not existing:
            raise NotFoundError(f"Blog {slug!r} not found")

        author = existing.get("author")
        author_id = author.get("id") if isinstance(author, dict) else str(author)
        if author_id != current_user.id and not current_user.is_admin:
            raise ForbiddenError("You don't have permission to edit this blog")

        updated = await self._repo.update(existing["id"], data)
        await cache_delete_pattern("blogs:list:*")
        await cache_delete(blog_cache_key(slug))
        await cache_delete(blog_cache_key(existing["id"]))
        return updated

    async def delete_blog(self, slug: str, current_user: CurrentUser) -> None:
        """Delete a blog (author or admin only) and bust all related caches."""
        existing = await self._repo.get_by_slug_or_id(slug)
        if not existing:
            raise NotFoundError(f"Blog {slug!r} not found")

        author = existing.get("author")
        author_id = author.get("id") if isinstance(author, dict) else str(author)
        if author_id != current_user.id and not current_user.is_admin:
            raise ForbiddenError("You don't have permission to delete this blog")

        await self._repo.delete(existing["id"], author_id)
        await cache_delete_pattern("blogs:list:*")
        await cache_delete(blog_cache_key(slug))
        await cache_delete(blog_cache_key(existing["id"]))
        await cache_delete(STATS_KEY)

    async def toggle_like(self, slug: str, current_user: CurrentUser) -> Tuple[int, bool]:
        """Toggle like on a blog and bust its detail cache."""
        blog = await self._repo.get_by_slug_or_id(slug)
        if not blog:
            raise NotFoundError(f"Blog {slug!r} not found")

        count, has_liked = await self._repo.toggle_like(blog["id"], current_user.id)
        await cache_delete(blog_cache_key(slug))
        await cache_delete(blog_cache_key(blog["id"]))
        return count, has_liked
