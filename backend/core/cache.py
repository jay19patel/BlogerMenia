"""Cache keys that invalidate themselves when content changes.

A TTL alone is the wrong tool for a list that must not go stale (a new category
should appear immediately) but is read on every page render. Instead each cached
family carries a version number; a content save bumps the version, which
orphans every key derived from it. No cache-invalidation bookkeeping, and no
window where a reader sees last hour's data.
"""
from django.core.cache import cache

VERSION_TTL = None  # never expire the counter itself


def _version_key(family: str) -> str:
    return f"version:{family}"


def version(family: str) -> int:
    current = cache.get(_version_key(family))
    if current is None:
        current = 1
        cache.set(_version_key(family), current, VERSION_TTL)
    return current


def bump(family: str) -> None:
    """Invalidate every key in `family`."""
    try:
        cache.incr(_version_key(family))
    except ValueError:
        # Nothing cached yet, so there is nothing to invalidate.
        cache.set(_version_key(family), 1, VERSION_TTL)


def cache_key(family: str, *parts) -> str:
    suffix = ':'.join(str(part) for part in parts)
    key = f"{family}:v{version(family)}"
    return f"{key}:{suffix}" if suffix else key
