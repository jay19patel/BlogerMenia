"""
Playlists router — all endpoints migrated from Next.js API routes.

GET    /api/v1/playlists/                        list (search, filters, pagination)
POST   /api/v1/playlists/                        create
GET    /api/v1/playlists/{playlist_id}/          get by id or slug (+ view tracking)
PATCH  /api/v1/playlists/{playlist_id}/          update (owner/admin only)
DELETE /api/v1/playlists/{playlist_id}/          delete (owner/admin only)
POST   /api/v1/playlists/{playlist_id}/blogs/    add blog to playlist
DELETE /api/v1/playlists/{playlist_id}/blogs/{blog_id}/  remove blog
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_optional_user
from app.application.playlist_service import PlaylistService
from app.database.mongo import get_db
from app.domain.exceptions import ForbiddenError, NotFoundError
from app.domain.models import CurrentUser
from app.domain.playlist_models import (
    AddBlogRequest,
    PlaylistCreate,
    PlaylistListOut,
    PlaylistOut,
    PlaylistUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/playlists", tags=["playlists"])


def _not_found(exc: NotFoundError) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _forbidden(exc: ForbiddenError) -> None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get("/", response_model=PlaylistListOut, summary="List playlists")
async def list_playlists(
    search: str = Query(""),
    owner_id: str = Query("", alias="ownerId"),
    is_public: Optional[str] = Query(None, alias="is_public"),
    blog_id: str = Query("", alias="blogId"),
    sort: str = Query("-createdAt"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> PlaylistListOut:
    is_public_bool: Optional[bool] = None
    if is_public == "true":
        is_public_bool = True
    elif is_public == "false":
        is_public_bool = False

    svc = PlaylistService(db)
    result = await svc.list_playlists(
        search=search, owner_id=owner_id, is_public=is_public_bool,
        blog_id=blog_id, sort=sort, skip=skip, limit=limit,
    )
    return PlaylistListOut(
        total=result["total"],
        playlists=[PlaylistOut(**p) for p in result["playlists"]],
        next=result.get("next"),
        previous=result.get("previous"),
    )


@router.post("/", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED, summary="Create playlist")
async def create_playlist(
    body: PlaylistCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> PlaylistOut:
    svc = PlaylistService(db)
    try:
        pl = await svc.create_playlist(body.model_dump(exclude_none=True), current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return PlaylistOut(**pl)


@router.get("/{playlist_id}/", response_model=PlaylistOut, summary="Get playlist by id or slug")
async def get_playlist(
    playlist_id: str,
    track_view: bool = Query(True, alias="track_view"),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> PlaylistOut:
    svc = PlaylistService(db)
    try:
        pl = await svc.get_playlist(playlist_id, track_view=track_view)
    except NotFoundError as exc:
        _not_found(exc)
    return PlaylistOut(**pl)


@router.patch("/{playlist_id}/", response_model=PlaylistOut, summary="Update playlist (owner/admin only)")
async def update_playlist(
    playlist_id: str,
    body: PlaylistUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> PlaylistOut:
    svc = PlaylistService(db)
    try:
        pl = await svc.update_playlist(playlist_id, body.model_dump(exclude_none=True), current_user)
    except NotFoundError as exc:
        _not_found(exc)
    except ForbiddenError as exc:
        _forbidden(exc)
    return PlaylistOut(**pl)


@router.delete("/{playlist_id}/", status_code=status.HTTP_204_NO_CONTENT, summary="Delete playlist (owner/admin only)")
async def delete_playlist(
    playlist_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Response:
    svc = PlaylistService(db)
    try:
        await svc.delete_playlist(playlist_id, current_user)
    except NotFoundError as exc:
        _not_found(exc)
    except ForbiddenError as exc:
        _forbidden(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{playlist_id}/blogs/", summary="Add blog to playlist")
async def add_blog_to_playlist(
    playlist_id: str,
    body: AddBlogRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    svc = PlaylistService(db)
    try:
        return await svc.add_blog(playlist_id, body.blog_id, current_user)
    except NotFoundError as exc:
        _not_found(exc)
    except ForbiddenError as exc:
        _forbidden(exc)


@router.delete("/{playlist_id}/blogs/{blog_id}/", summary="Remove blog from playlist")
async def remove_blog_from_playlist(
    playlist_id: str,
    blog_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    svc = PlaylistService(db)
    try:
        return await svc.remove_blog(playlist_id, blog_id, current_user)
    except NotFoundError as exc:
        _not_found(exc)
    except ForbiddenError as exc:
        _forbidden(exc)
