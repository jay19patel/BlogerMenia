"""
Playlist domain models.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BlogRef(BaseModel):
    """Minimal blog info embedded in a playlist."""
    id: str
    title: Optional[str] = None
    slug: Optional[str] = None
    thumbnail: Optional[str] = None
    views: int = 0


class OwnerRef(BaseModel):
    id: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    profile_image: Optional[str] = None


class PlaylistOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    thumbnail: Optional[str] = None   # alias accepted from client
    is_public: bool = True
    blogs: List[Any] = []
    blog_count: int = 0
    total_views: int = 0
    total_likes: int = 0
    owner: Optional[Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PlaylistCreate(BaseModel):
    name: Optional[str] = Field(None, description="Playlist name")
    title: Optional[str] = Field(None, description="Alias for name")
    slug: Optional[str] = None
    description: Optional[str] = ""
    cover_image: Optional[str] = None
    thumbnail: Optional[str] = None    # alias
    is_public: bool = True
    blogs: List[str] = []


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    thumbnail: Optional[str] = None
    is_public: Optional[bool] = None
    blogs: Optional[List[str]] = None


class PlaylistListOut(BaseModel):
    total: int
    playlists: List[PlaylistOut]
    next: Optional[str] = None
    previous: Optional[str] = None


class AddBlogRequest(BaseModel):
    blog_id: str
