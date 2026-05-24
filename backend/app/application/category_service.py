"""
CategoryService — orchestrates category operations + Redis cache.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.redis import (
    CATEGORIES_KEY, TTL_CATEGORIES,
    cache_delete, cache_get, cache_set,
)
from app.infrastructure.category_repo import CategoryRepository

logger = logging.getLogger(__name__)


class CategoryService:
    """Business logic for categories — thin layer on top of the repo."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._repo = CategoryRepository(db)

    async def list_categories(self, username: Optional[str] = None) -> List[dict]:
        """Return categories, with caching for the global list."""
        if username:
            # Per-user lists are cheap enough to skip caching
            return await self._repo.list_by_user(username)

        cached = await cache_get(CATEGORIES_KEY)
        if cached is not None:
            return cached

        categories = await self._repo.list_all()
        await cache_set(CATEGORIES_KEY, categories, TTL_CATEGORIES)
        return categories

    async def get_or_create(self, name: str, slug: Optional[str] = None) -> dict:
        """Get or create a category, then bust the categories cache."""
        category = await self._repo.get_or_create(name, slug)
        await cache_delete(CATEGORIES_KEY)
        return category
