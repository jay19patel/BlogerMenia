"""
Interactions router — user-scoped likes & bookmarks.

Endpoints:
  GET    /api/v1/blogs/{slug}/interaction/      current user's like + bookmark state
  POST   /api/v1/blogs/{slug}/bookmark/         create or update bookmark (section pointer)
  DELETE /api/v1/blogs/{slug}/bookmark/         remove bookmark
  GET    /api/v1/users/me/bookmarks/            list current user's bookmarks
  GET    /api/v1/users/me/likes/                list blog ids the current user has liked
"""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongo import get_db
from app.deps import get_current_user
from app.exceptions import NotFoundError
from app.models.blog import CurrentUser
from app.models.interaction import (
    BlogInteractionOut,
    BookmarkCreate,
    BookmarkOut,
)
from app.services.interaction_service import InteractionService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["interactions"])


def _not_found(exc: NotFoundError) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ── Per-blog interaction snapshot ────────────────────────────────────────────

@router.get(
    "/api/v1/blogs/{slug}/interaction/",
    response_model=BlogInteractionOut,
    summary="Get current user's like + bookmark state for a blog",
)
async def get_interaction(
    slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> BlogInteractionOut:
    svc = InteractionService(db)
    try:
        data = await svc.get_blog_interaction(slug, current_user.id)
    except NotFoundError as exc:
        _not_found(exc)
    bookmark = BookmarkOut(**data["bookmark"]) if data.get("bookmark") else None
    return BlogInteractionOut(has_liked=data["has_liked"], bookmark=bookmark)


# ── Bookmarks ────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/blogs/{slug}/bookmark/",
    response_model=BookmarkOut,
    summary="Save (or update) a bookmark for a blog section",
)
async def save_bookmark(
    slug: str,
    body: BookmarkCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> BookmarkOut:
    svc = InteractionService(db)
    try:
        bookmark = await svc.save_bookmark(
            slug, current_user.id, body.section_id, body.section_title,
        )
    except NotFoundError as exc:
        _not_found(exc)
    return BookmarkOut(**bookmark)


@router.delete(
    "/api/v1/blogs/{slug}/bookmark/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a bookmark for a blog",
)
async def delete_bookmark(
    slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    svc = InteractionService(db)
    try:
        await svc.remove_bookmark(slug, current_user.id)
    except NotFoundError as exc:
        _not_found(exc)
    return None


@router.get(
    "/api/v1/users/me/bookmarks/",
    response_model=List[BookmarkOut],
    summary="List current user's bookmarks (most-recent first)",
)
async def list_my_bookmarks(
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> List[BookmarkOut]:
    svc = InteractionService(db)
    items = await svc.list_user_bookmarks(current_user.id, limit=limit)
    return [BookmarkOut(**item) for item in items]


# ── Liked-blog ids (for highlighting cards client-side) ──────────────────────

@router.get(
    "/api/v1/users/me/likes/",
    summary="List blog ids the current user has liked",
)
async def list_my_likes(
    limit: int = Query(100, ge=1, le=500),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    svc = InteractionService(db)
    ids = await svc.list_user_liked_blog_ids(current_user.id, limit=limit)
    return {"blog_ids": ids}
