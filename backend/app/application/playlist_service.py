"""
PlaylistService — playlist use-cases with Redis caching.
Cache strategy:
  playlists:list:<hash>   TTL 60s  — busted on create/update/delete
  playlist:<id_or_slug>   TTL 120s — busted on update/delete/blog-add/remove
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.redis import (
    cache_delete, cache_delete_pattern, cache_get,
    cache_set, list_cache_key,
)
from app.domain.exceptions import ForbiddenError, NotFoundError
from app.domain.models import CurrentUser
from app.infrastructure.playlist_repo import PlaylistRepository

logger = logging.getLogger(__name__)

TTL_LIST = 60
TTL_DETAIL = 120


def _playlist_key(key: str) -> str:
    return f"playlist:{key}"


class PlaylistService:

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._repo = PlaylistRepository(db)

    async def list_playlists(
        self,
        search: str = "",
        owner_id: str = "",
        is_public: Optional[bool] = None,
        blog_id: str = "",
        sort: str = "-createdAt",
        skip: int = 0,
        limit: int = 10,
    ) -> Dict[str, Any]:
        params = dict(search=search, owner_id=owner_id, is_public=is_public,
                      blog_id=blog_id, sort=sort, skip=skip, limit=limit)
        key = list_cache_key(params)
        key = f"playlists:{key}"
        cached = await cache_get(key)
        if cached is not None:
            return cached

        total, playlists = await self._repo.list_playlists(**params)
        result = {
            "total": total,
            "playlists": playlists,
            "next": f"?skip={skip+limit}&limit={limit}" if skip + limit < total else None,
            "previous": f"?skip={max(0,skip-limit)}&limit={limit}" if skip > 0 else None,
        }
        await cache_set(key, result, TTL_LIST)
        return result

    async def get_playlist(self, playlist_id: str, track_view: bool = True) -> dict:
        key = _playlist_key(playlist_id)
        if not track_view:
            cached = await cache_get(key)
            if cached is not None:
                return cached

        pl = await self._repo.get_by_id_or_slug(playlist_id)
        if not pl:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")

        if track_view:
            await self._repo.increment_views(pl["id"])
            pl["total_views"] = pl.get("total_views", 0) + 1
        else:
            await cache_set(key, pl, TTL_DETAIL)
        return pl

    async def create_playlist(self, data: dict, current_user: CurrentUser) -> dict:
        pl = await self._repo.create(data, current_user.id)
        await cache_delete_pattern("playlists:*")
        return pl

    async def update_playlist(self, playlist_id: str, data: dict, current_user: CurrentUser) -> dict:
        pl = await self._repo.get_by_id_or_slug(playlist_id)
        if not pl:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")
        owner = pl.get("owner")
        owner_id = owner.get("id") if isinstance(owner, dict) else str(owner)
        if owner_id != current_user.id and not current_user.is_admin:
            raise ForbiddenError("You don't have permission to edit this playlist")
        updated = await self._repo.update(pl["id"], data)
        await cache_delete_pattern("playlists:*")
        await cache_delete(_playlist_key(playlist_id))
        await cache_delete(_playlist_key(pl["id"]))
        return updated

    async def delete_playlist(self, playlist_id: str, current_user: CurrentUser) -> None:
        pl = await self._repo.get_by_id_or_slug(playlist_id)
        if not pl:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")
        owner = pl.get("owner")
        owner_id = owner.get("id") if isinstance(owner, dict) else str(owner)
        if owner_id != current_user.id and not current_user.is_admin:
            raise ForbiddenError("You don't have permission to delete this playlist")
        await self._repo.delete(pl["id"])
        await cache_delete_pattern("playlists:*")
        await cache_delete(_playlist_key(playlist_id))
        await cache_delete(_playlist_key(pl["id"]))

    async def add_blog(self, playlist_id: str, blog_id: str, current_user: CurrentUser) -> dict:
        pl = await self._repo.get_by_id_or_slug(playlist_id)
        if not pl:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")
        owner = pl.get("owner")
        owner_id = owner.get("id") if isinstance(owner, dict) else str(owner)
        if owner_id != current_user.id and not current_user.is_admin:
            raise ForbiddenError("You don't have permission to modify this playlist")
        result = await self._repo.add_blog(pl["id"], blog_id)
        await cache_delete(_playlist_key(playlist_id))
        await cache_delete(_playlist_key(pl["id"]))
        return result

    async def remove_blog(self, playlist_id: str, blog_id: str, current_user: CurrentUser) -> dict:
        pl = await self._repo.get_by_id_or_slug(playlist_id)
        if not pl:
            raise NotFoundError(f"Playlist {playlist_id!r} not found")
        owner = pl.get("owner")
        owner_id = owner.get("id") if isinstance(owner, dict) else str(owner)
        if owner_id != current_user.id and not current_user.is_admin:
            raise ForbiddenError("You don't have permission to modify this playlist")
        result = await self._repo.remove_blog(pl["id"], blog_id)
        await cache_delete(_playlist_key(playlist_id))
        await cache_delete(_playlist_key(pl["id"]))
        return result
