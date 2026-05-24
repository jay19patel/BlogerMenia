"""
Redis async client — shared singleton with TTL-based caching helpers.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None
_redis_enabled: bool = True

# ── TTL constants ─────────────────────────────────────────────────────────────
TTL_BLOG_LIST = 60      # seconds — list pages invalidate quickly
TTL_BLOG_DETAIL = 300   # 5 min — individual blog post
TTL_STATS = 120         # 2 min — platform stats
TTL_CATEGORIES = 600    # 10 min — categories rarely change


async def connect_to_redis() -> None:
    """Open the Redis connection pool. Call once at app startup. Handles connection failures gracefully."""
    global _redis, _redis_enabled
    try:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        await _redis.ping()
        _redis_enabled = True
        logger.info("Connected to Redis at %s", settings.redis_url)
    except Exception as exc:
        _redis_enabled = False
        _redis = None
        logger.warning(
            "Redis is not available at %s. Caching will be gracefully disabled. Error: %s",
            settings.redis_url,
            exc,
        )


async def close_redis_connection() -> None:
    """Close the Redis connection pool."""
    global _redis, _redis_enabled
    if _redis:
        try:
            await _redis.aclose()
        except Exception as exc:
            logger.debug("Failed to close Redis connection: %s", exc)
        _redis = None
    _redis_enabled = False
    logger.info("Redis connection closed.")


def get_redis() -> aioredis.Redis:
    """Return active Redis client. Raises RuntimeError if disabled or not connected."""
    if not _redis_enabled or _redis is None:
        raise RuntimeError("Redis client is disabled or not initialised")
    return _redis


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _make_key(prefix: str, params: dict | str) -> str:
    """Deterministic cache key from prefix + params dict or raw string."""
    if isinstance(params, str):
        return f"{prefix}:{params}"
    raw = json.dumps(params, sort_keys=True)
    digest = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"{prefix}:{digest}"


async def cache_get(key: str) -> Any | None:
    """Return cached value or None on miss / error."""
    if not _redis_enabled:
        return None
    try:
        r = get_redis()
        raw = await r.get(key)
        return json.loads(raw) if raw is not None else None
    except Exception:
        logger.warning("Redis cache_get failed for key=%s", key, exc_info=True)
        return None


async def cache_set(key: str, value: Any, ttl: int) -> None:
    """Write value to cache. Silently fails on Redis errors."""
    if not _redis_enabled:
        return
    try:
        r = get_redis()
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        logger.warning("Redis cache_set failed for key=%s", key, exc_info=True)


async def cache_delete(key: str) -> None:
    """Delete a single cache key."""
    if not _redis_enabled:
        return
    try:
        await get_redis().delete(key)
    except Exception:
        logger.warning("Redis cache_delete failed for key=%s", key, exc_info=True)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern (e.g. 'blogs:list:*')."""
    if not _redis_enabled:
        return
    try:
        r = get_redis()
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except Exception:
        logger.warning("Redis cache_delete_pattern failed for pattern=%s", pattern, exc_info=True)


def list_cache_key(params: dict) -> str:
    return _make_key("blogs:list", params)


def blog_cache_key(slug: str) -> str:
    return _make_key("blog", slug)


STATS_KEY = "stats"
CATEGORIES_KEY = "categories"
