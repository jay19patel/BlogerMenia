"""
Domain models (Pydantic) — mirror the Mongoose schemas in the Next.js frontend.
These are pure data contracts; no database logic here.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Author embedded in blog responses ────────────────────────────────────────

class AuthorOut(BaseModel):
    id: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    profile_image: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    blog_count: int = 0
    total_views: int = 0


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = None


# ── Blog ──────────────────────────────────────────────────────────────────────

class BlogOut(BaseModel):
    """Full blog representation returned to the client."""
    id: str
    slug: str
    title: str
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    thumbnail: Optional[str] = None
    image: Optional[str] = None          # alias used by AI-generated blogs
    content: Dict[str, Any] = {}
    author: Optional[AuthorOut] = None
    category: Optional[CategoryOut] = None
    category_name: Optional[str] = None
    featured: bool = False
    is_published: bool = True
    views: int = 0
    likes: int = 0
    published_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BlogCreate(BaseModel):
    """Fields accepted when creating a new blog."""
    title: str = Field(..., min_length=1, max_length=500)
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    thumbnail: Optional[str] = None
    image: Optional[str] = None
    category: Optional[str] = None        # category ObjectId or name
    category_name: Optional[str] = None
    tags: List[str] = []
    content: Optional[Dict[str, Any]] = None
    # Flat content fields (Next.js frontend sends these)
    introduction: Optional[str] = None
    conclusion: Optional[str] = None
    sections: Optional[List[Any]] = None
    is_published: bool = True
    featured: bool = False


class BlogUpdate(BaseModel):
    """Fields accepted when partially updating a blog."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    thumbnail: Optional[str] = None
    image: Optional[str] = None
    category: Optional[str] = None
    category_name: Optional[str] = None
    tags: Optional[List[str]] = None
    content: Optional[Dict[str, Any]] = None
    introduction: Optional[str] = None
    conclusion: Optional[str] = None
    sections: Optional[List[Any]] = None
    is_published: Optional[bool] = None
    featured: Optional[bool] = None


class BlogListOut(BaseModel):
    """Paginated list response."""
    total: int
    blogs: List[BlogOut]
    next: Optional[str] = None
    previous: Optional[str] = None


# ── Like toggle ───────────────────────────────────────────────────────────────

class LikeOut(BaseModel):
    success: bool
    likes_count: int
    has_liked: bool


# ── Stats ─────────────────────────────────────────────────────────────────────

class StatsOut(BaseModel):
    total_blogs: int
    total_views: int
    total_authors: int


# ── Current user (decoded from JWT) ──────────────────────────────────────────

class CurrentUser(BaseModel):
    """Lightweight user identity injected by the auth dependency."""
    id: str
    email: str
    role: str = "User"

    @property
    def is_admin(self) -> bool:
        return self.role == "Admin"
