"""
Blog + Category router — all endpoints migrated from Next.js API routes.

Endpoints:
  GET    /api/v1/blogs/               list blogs (search, pagination, filters)
  POST   /api/v1/blogs/               create blog
  GET    /api/v1/blogs/stats/         platform stats
  GET    /api/v1/blogs/categories/    list categories
  POST   /api/v1/blogs/categories/    create / get-or-create category
  GET    /api/v1/blogs/{slug}/        get blog by slug or id
  PATCH  /api/v1/blogs/{slug}/        update blog
  DELETE /api/v1/blogs/{slug}/        delete blog
  POST   /api/v1/blogs/{slug}/like/   toggle like
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_optional_user
from app.application.blog_service import BlogService
from app.application.category_service import CategoryService
from app.database.mongo import get_db
from app.domain.exceptions import ForbiddenError, NotFoundError
from app.domain.models import (
    BlogCreate,
    BlogListOut,
    BlogOut,
    BlogUpdate,
    CategoryCreate,
    CategoryOut,
    CurrentUser,
    LikeOut,
    StatsOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/blogs", tags=["blogs"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _handle_not_found(exc: NotFoundError) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _handle_forbidden(exc: ForbiddenError) -> None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


# ── Stats (must be before /{slug} to avoid route collision) ───────────────────

@router.get("/stats/", response_model=StatsOut, summary="Platform-wide statistics")
async def get_stats(db: AsyncIOMotorDatabase = Depends(get_db)) -> StatsOut:
    """Returns total blogs, total views, and total registered authors."""
    svc = BlogService(db)
    return StatsOut(**await svc.get_stats())


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories/", response_model=list[CategoryOut], summary="List categories")
async def list_categories(
    username: Optional[str] = Query(None, description="Filter to categories used by this username"),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[CategoryOut]:
    svc = CategoryService(db)
    cats = await svc.list_categories(username=username)
    return [CategoryOut(**c) for c in cats]


@router.post(
    "/categories/",
    response_model=CategoryOut,
    status_code=status.HTTP_200_OK,
    summary="Get-or-create a category",
)
async def create_category(
    body: CategoryCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> CategoryOut:
    svc = CategoryService(db)
    cat = await svc.get_or_create(body.name, body.slug)
    return CategoryOut(**cat)


# ── Blog list + create ────────────────────────────────────────────────────────

@router.get("/", response_model=BlogListOut, summary="List blogs with filters")
async def list_blogs(
    search: str = Query("", description="Search in title and excerpt"),
    category: str = Query("", alias="category"),
    author_id: str = Query("", alias="authorId"),
    exclude_slug: str = Query("", alias="excludeSlug"),
    sort: str = Query("-createdAt", description="-createdAt or -views"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> BlogListOut:
    svc = BlogService(db)
    result = await svc.list_blogs(
        search=search,
        category_name=category,
        author_id=author_id,
        exclude_slug=exclude_slug,
        sort=sort,
        skip=skip,
        limit=limit,
    )
    return BlogListOut(
        total=result["total"],
        blogs=[BlogOut(**b) for b in result["blogs"]],
        next=result.get("next"),
        previous=result.get("previous"),
    )


@router.post("/", response_model=BlogOut, status_code=status.HTTP_201_CREATED, summary="Create blog")
async def create_blog(
    body: BlogCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> BlogOut:
    svc = BlogService(db)
    try:
        blog = await svc.create_blog(body.model_dump(exclude_none=True), current_user)
    except Exception as exc:
        logger.error("create_blog failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create blog: {exc}")
    return BlogOut(**blog)


# ── Blog detail, update, delete ───────────────────────────────────────────────

@router.get("/{slug}/", response_model=BlogOut, summary="Get blog by slug or id")
async def get_blog(
    slug: str,
    track_view: bool = Query(True, alias="track_view"),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> BlogOut:
    svc = BlogService(db)
    try:
        blog = await svc.get_blog(slug, track_view=track_view)
    except NotFoundError as exc:
        _handle_not_found(exc)
    return BlogOut(**blog)


@router.patch("/{slug}/", response_model=BlogOut, summary="Update blog (author/admin only)")
async def update_blog(
    slug: str,
    body: BlogUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> BlogOut:
    svc = BlogService(db)
    try:
        blog = await svc.update_blog(slug, body.model_dump(exclude_none=True), current_user)
    except NotFoundError as exc:
        _handle_not_found(exc)
    except ForbiddenError as exc:
        _handle_forbidden(exc)
    return BlogOut(**blog)


@router.delete("/{slug}/", status_code=status.HTTP_204_NO_CONTENT, summary="Delete blog (author/admin only)")
async def delete_blog(
    slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Response:
    svc = BlogService(db)
    try:
        await svc.delete_blog(slug, current_user)
    except NotFoundError as exc:
        _handle_not_found(exc)
    except ForbiddenError as exc:
        _handle_forbidden(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Like toggle ───────────────────────────────────────────────────────────────

@router.post("/{slug}/like/", response_model=LikeOut, summary="Toggle like on a blog")
async def toggle_like(
    slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> LikeOut:
    svc = BlogService(db)
    try:
        count, has_liked = await svc.toggle_like(slug, current_user)
    except NotFoundError as exc:
        _handle_not_found(exc)
    return LikeOut(success=True, likes_count=count, has_liked=has_liked)
