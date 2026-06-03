"""
VectorSearch — in-process embedding cache + cosine similarity.

Why not Mongo $vectorSearch?
- We run on a local Mongo (not Atlas), so the native operator isn't available.
- The blog corpus is small (~hundreds to a few thousand docs), so scanning
  all vectors in pure Python is sub-100ms and avoids extra infra.

Cache invalidation:
- We keep a single in-process cache keyed by collection size + the max
  updatedAt timestamp seen across blogs. When either changes we refresh.
  This works without explicit hooks because every write in BlogRepository
  bumps updatedAt.
- TTL fallback ensures the cache eventually rebuilds even if updatedAt
  somehow lags (e.g. after a backfill that bypasses the repo).
"""
from __future__ import annotations

import logging
import math
import re
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.embeddings import (
    build_blog_source_text,
    embed_text,
    is_enabled as embeddings_enabled,
)

logger = logging.getLogger(__name__)

# Weight for the cosine component when combining with keyword bonus.
# 0.7 cosine + 0.3 keyword is a sensible default: semantic dominates but an
# exact title match still gets a meaningful boost so it can't be buried.
COSINE_WEIGHT = 0.7
KEYWORD_WEIGHT = 0.3

CACHE_TTL_SECONDS = 300  # rebuild at most once every 5 min if nothing changed


@dataclass
class _Entry:
    blog_id: str
    slug: str
    title: str
    excerpt: str
    category: str
    tags_lower: str
    vector: List[float]
    norm: float
    updated_at: float = 0.0


@dataclass
class _Cache:
    entries: List[_Entry] = field(default_factory=list)
    by_id: Dict[str, _Entry] = field(default_factory=dict)
    built_at: float = 0.0
    total_blogs: int = 0
    latest_updated_at: float = 0.0


_cache = _Cache()


# ── Maths ────────────────────────────────────────────────────────────────────

def _vec_norm(v: List[float]) -> float:
    return math.sqrt(sum(x * x for x in v)) or 1.0


def _cosine(a: List[float], a_norm: float, b: List[float], b_norm: float) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    for x, y in zip(a, b):
        dot += x * y
    return dot / (a_norm * b_norm)


# ── Cache management ─────────────────────────────────────────────────────────

async def _needs_rebuild(db: AsyncIOMotorDatabase) -> bool:
    if not _cache.entries:
        return True
    if (time.time() - _cache.built_at) > CACHE_TTL_SECONDS:
        return True
    total = await db["blogs"].count_documents({"embedding": {"$exists": True}})
    if total != _cache.total_blogs:
        return True
    latest = await db["blogs"].find_one(
        {"embedding": {"$exists": True}},
        sort=[("updatedAt", -1)],
        projection={"updatedAt": 1},
    )
    latest_ts = (latest or {}).get("updatedAt")
    latest_ts_f = latest_ts.timestamp() if hasattr(latest_ts, "timestamp") else 0.0
    if latest_ts_f > _cache.latest_updated_at + 0.001:
        return True
    return False


async def _rebuild(db: AsyncIOMotorDatabase) -> None:
    """Load all blogs that carry an embedding into the in-process cache."""
    new_entries: List[_Entry] = []
    by_id: Dict[str, _Entry] = {}
    latest_ts = 0.0

    cursor = db["blogs"].find(
        {"embedding": {"$exists": True}, "is_published": {"$ne": False}},
        projection={
            "embedding": 1, "slug": 1, "title": 1, "excerpt": 1,
            "subtitle": 1, "category_name": 1, "tags": 1, "updatedAt": 1,
        },
    )
    async for doc in cursor:
        vec = doc.get("embedding") or []
        if not vec:
            continue
        norm = _vec_norm(vec)
        tags = doc.get("tags") or []
        tags_str = " ".join(str(t) for t in tags) if isinstance(tags, list) else ""
        entry = _Entry(
            blog_id=str(doc["_id"]),
            slug=doc.get("slug", ""),
            title=doc.get("title", "") or "",
            excerpt=(doc.get("excerpt") or doc.get("subtitle") or "") or "",
            category=(doc.get("category_name") or "") or "",
            tags_lower=tags_str.lower(),
            vector=list(vec),
            norm=norm,
        )
        ts = doc.get("updatedAt")
        if hasattr(ts, "timestamp"):
            entry.updated_at = ts.timestamp()
            if entry.updated_at > latest_ts:
                latest_ts = entry.updated_at
        new_entries.append(entry)
        by_id[entry.blog_id] = entry

    _cache.entries = new_entries
    _cache.by_id = by_id
    _cache.total_blogs = len(new_entries)
    _cache.latest_updated_at = latest_ts
    _cache.built_at = time.time()
    logger.info("Vector cache rebuilt: %d entries", len(new_entries))


async def _ensure_cache(db: AsyncIOMotorDatabase) -> None:
    if await _needs_rebuild(db):
        await _rebuild(db)


# ── Scoring ──────────────────────────────────────────────────────────────────

_WORD_RE = re.compile(r"[a-z0-9]+")


def _keyword_bonus(query_lower: str, query_tokens: List[str], entry: _Entry) -> float:
    """A small 0..1 bonus rewarding literal token hits in title/excerpt/tags/category.

    This makes hybrid scoring stable for "type the exact title" queries —
    pure cosine sometimes ranks a vaguely-related blog above the literal hit.
    """
    if not query_tokens:
        return 0.0
    title_l = entry.title.lower()
    excerpt_l = entry.excerpt.lower()
    cat_l = entry.category.lower()

    score = 0.0
    # Exact phrase in the title is a strong signal.
    if query_lower and query_lower in title_l:
        score += 0.8
    # Token hits, weighted by field.
    title_hits = sum(1 for t in query_tokens if t in title_l)
    excerpt_hits = sum(1 for t in query_tokens if t in excerpt_l)
    tag_hits = sum(1 for t in query_tokens if t in entry.tags_lower)
    cat_hits = sum(1 for t in query_tokens if t in cat_l)
    denom = max(1, len(query_tokens))
    score += 0.5 * (title_hits / denom)
    score += 0.2 * (excerpt_hits / denom)
    score += 0.2 * (tag_hits / denom)
    score += 0.1 * (cat_hits / denom)
    return min(score, 1.0)


# ── Public API ───────────────────────────────────────────────────────────────

async def search(
    db: AsyncIOMotorDatabase,
    query: str,
    *,
    limit: int = 10,
    candidate_ids: Optional[List[str]] = None,
    min_score: float = 0.0,
) -> List[Tuple[str, float]]:
    """Hybrid search. Returns [(blog_id, score), ...] sorted desc by score.

    `candidate_ids` lets the caller pre-filter by category/author/etc before
    we score, which keeps the result set faithful to existing filters.
    """
    query = (query or "").strip()
    if not query or not embeddings_enabled():
        return []

    await _ensure_cache(db)
    if not _cache.entries:
        return []

    q_vec = await embed_text(query)
    if not q_vec:
        return []
    q_norm = _vec_norm(q_vec)

    q_lower = query.lower()
    q_tokens = _WORD_RE.findall(q_lower)
    candidate_set = set(candidate_ids) if candidate_ids is not None else None

    scored: List[Tuple[str, float]] = []
    for entry in _cache.entries:
        if candidate_set is not None and entry.blog_id not in candidate_set:
            continue
        cosine = _cosine(q_vec, q_norm, entry.vector, entry.norm)
        # cosine for normalized embeddings is in [-1, 1]; map to [0, 1] so it
        # composes cleanly with the keyword bonus (also in [0, 1]).
        cosine_01 = (cosine + 1.0) / 2.0
        kw = _keyword_bonus(q_lower, q_tokens, entry)
        score = COSINE_WEIGHT * cosine_01 + KEYWORD_WEIGHT * kw
        if score >= min_score:
            scored.append((entry.blog_id, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]


async def related(
    db: AsyncIOMotorDatabase,
    blog_id: str,
    *,
    limit: int = 4,
    exclude_ids: Optional[List[str]] = None,
) -> List[Tuple[str, float]]:
    """Return blogs most semantically similar to `blog_id`.

    Falls back to an empty list when the source blog has no embedding yet
    (caller can then degrade to its previous random selection).
    """
    if not embeddings_enabled():
        return []
    await _ensure_cache(db)
    src = _cache.by_id.get(str(blog_id))
    if src is None or not src.vector:
        return []

    exclude = set(exclude_ids or [])
    exclude.add(src.blog_id)

    scored: List[Tuple[str, float]] = []
    for entry in _cache.entries:
        if entry.blog_id in exclude:
            continue
        cosine = _cosine(src.vector, src.norm, entry.vector, entry.norm)
        scored.append((entry.blog_id, (cosine + 1.0) / 2.0))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]


def invalidate_cache() -> None:
    """Force the next search/related call to rebuild from Mongo. Call this
    after bulk writes (e.g. backfill scripts) that bypass the normal write path."""
    _cache.entries = []
    _cache.by_id = {}
    _cache.built_at = 0.0
    _cache.total_blogs = 0
    _cache.latest_updated_at = 0.0
