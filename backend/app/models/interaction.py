"""
Domain models for user interactions with blogs: likes and bookmarks.
- Likes live in their own collection so we can query "blogs liked by user"
  cheaply and avoid unbounded arrays on the blog document.
- Bookmarks store a section pointer so the user can resume reading where
  they left off.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Likes ─────────────────────────────────────────────────────────────────────

class LikeToggleOut(BaseModel):
    """Response from toggling a like. Shape matches what the frontend expects
    (status + total_likes) so existing UI keeps working."""
    success: bool = True
    has_liked: bool
    likes_count: int
    status: str           # "liked" | "unliked"
    total_likes: int


# ── Bookmarks ─────────────────────────────────────────────────────────────────

class BookmarkCreate(BaseModel):
    section_id: str = Field(..., min_length=1, max_length=200)
    section_title: Optional[str] = Field(None, max_length=300)


class BookmarkOut(BaseModel):
    id: str
    blog_id: str
    section_id: str
    section_title: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Populated blog snapshot (for rendering on home page without a join)
    blog_slug: Optional[str] = None
    blog_title: Optional[str] = None
    blog_thumbnail: Optional[str] = None
    blog_excerpt: Optional[str] = None
    blog_category: Optional[str] = None
    author_email: Optional[str] = None
    author_username: Optional[str] = None
    author_full_name: Optional[str] = None


# ── Combined interaction snapshot returned for the blog-detail page ───────────

class BlogInteractionOut(BaseModel):
    """What the frontend pulls on blog-detail to render like/bookmark state."""
    has_liked: bool = False
    bookmark: Optional[BookmarkOut] = None
