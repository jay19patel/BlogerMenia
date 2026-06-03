"""
EmbeddingsService — thin wrapper around the Mistral embeddings API.

Why a wrapper?
- Keeps the Mistral SDK off our hot path (we only import it when actually
  computing embeddings, so the app boots even without the API key set).
- Normalises the response shape, batches large input sets, and applies a
  simple exponential back-off on transient errors.
- Exposes helpers for hashing the source text so we can skip regeneration
  when a blog's body has not changed.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Iterable, List, Optional, Sequence

from app.config import settings

logger = logging.getLogger(__name__)

# Mistral's `mistral-embed` returns 1024-dim vectors.
EMBEDDING_DIM = 1024

# Soft cap on characters we feed into the embedding model. Mistral accepts up
# to ~8192 tokens; we trim conservatively to ~24k chars (~6k tokens) so a
# single batch never explodes payload size.
MAX_CHARS_PER_INPUT = 24_000


# ── Source-text builder ──────────────────────────────────────────────────────

def _flatten_sections(sections: object) -> str:
    """Best-effort flatten of the heterogeneous `content.sections` array into a
    plain-text blob suitable for embedding. Mirrors what BlogDetail renders."""
    if not isinstance(sections, list):
        return ""
    parts: List[str] = []
    for s in sections:
        if not isinstance(s, dict):
            continue
        if s.get("title"):
            parts.append(str(s["title"]))
        c = s.get("content")
        if isinstance(c, str):
            parts.append(c)
        elif isinstance(c, list):
            parts.extend(str(x) for x in c if x)
        if isinstance(s.get("items"), list):
            for item in s["items"]:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and item.get("text"):
                    parts.append(str(item["text"]))
        if isinstance(s.get("links"), list):
            for link in s["links"]:
                if isinstance(link, dict):
                    if link.get("text"):
                        parts.append(str(link["text"]))
                    if link.get("description"):
                        parts.append(str(link["description"]))
        if s.get("caption"):
            parts.append(str(s["caption"]))
        if s.get("description"):
            parts.append(str(s["description"]))
    return " ".join(parts)


def build_blog_source_text(blog: dict) -> str:
    """Produce the canonical text we embed for a blog.

    Combines title + subtitle + excerpt + category + tags + content sections.
    Heading first so it carries the most weight when the model attends to the
    start of the input.
    """
    title = (blog.get("title") or "").strip()
    subtitle = (blog.get("subtitle") or "").strip()
    excerpt = (blog.get("excerpt") or "").strip()
    category = (blog.get("category_name") or "").strip()
    tags = blog.get("tags") or []
    if isinstance(tags, list):
        tags_str = " ".join(str(t) for t in tags if t)
    else:
        tags_str = ""

    content = blog.get("content") or {}
    intro = content.get("introduction") or ""
    conclusion = content.get("conclusion") or ""
    sections_text = _flatten_sections(content.get("sections"))

    raw = " \n".join(filter(None, [
        title, subtitle, excerpt,
        f"Category: {category}" if category else "",
        f"Tags: {tags_str}" if tags_str else "",
        intro, sections_text, conclusion,
    ]))
    # Collapse whitespace and trim to soft cap.
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw[:MAX_CHARS_PER_INPUT]


def hash_source_text(text: str) -> str:
    """Stable short hash for change-detection. Cheaper than storing the whole
    source text alongside every blog doc."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


# ── Embeddings client ────────────────────────────────────────────────────────

_client = None


def _get_client():
    """Lazy-construct the Mistral SDK client. Returns None when no API key is
    configured so callers can degrade gracefully (search falls back to keyword)."""
    global _client
    if _client is not None:
        return _client
    if not settings.mistral_api_key:
        logger.info("MISTRAL_API_KEY not set; embeddings disabled.")
        return None
    try:
        # mistralai v2 exposes the SDK at `mistralai.client.Mistral`.
        from mistralai.client import Mistral  # type: ignore
    except ImportError as exc:
        logger.warning("Could not import mistralai.client.Mistral; embeddings disabled. (%s)", exc)
        return None
    _client = Mistral(api_key=settings.mistral_api_key)
    logger.info("Mistral embeddings client initialised (model=%s)", settings.mistral_embed_model)
    return _client


def is_enabled() -> bool:
    """True when embeddings can actually be generated."""
    return _get_client() is not None


async def _embed_chunk(texts: Sequence[str]) -> List[List[float]]:
    """Call Mistral once for up to `mistral_embed_batch_size` inputs."""
    client = _get_client()
    if client is None:
        raise RuntimeError("Mistral client not configured (set MISTRAL_API_KEY).")

    last_err: Optional[Exception] = None
    for attempt in range(3):
        try:
            resp = await client.embeddings.create_async(
                model=settings.mistral_embed_model,
                inputs=list(texts),
            )
            out: List[List[float]] = []
            for d in resp.data:
                vec = getattr(d, "embedding", None)
                if vec is None and isinstance(d, dict):
                    vec = d.get("embedding")
                if vec is None:
                    raise RuntimeError("Mistral response missing 'embedding' field")
                out.append(list(vec))
            return out
        except Exception as exc:  # broad: SDK raises a mix of errors
            last_err = exc
            backoff = 0.5 * (2 ** attempt)
            logger.warning(
                "Mistral embed attempt %d/3 failed: %s (retry in %.1fs)",
                attempt + 1, exc, backoff,
            )
            await asyncio.sleep(backoff)
    raise RuntimeError(f"Mistral embed failed after 3 attempts: {last_err}")


async def embed_text(text: str) -> Optional[List[float]]:
    """Embed a single string. Returns None when embeddings are disabled or
    when the input is empty, so callers can treat both cases the same way."""
    text = (text or "").strip()
    if not text:
        return None
    if not is_enabled():
        return None
    vecs = await _embed_chunk([text[:MAX_CHARS_PER_INPUT]])
    return vecs[0] if vecs else None


async def embed_batch(texts: Iterable[str]) -> List[Optional[List[float]]]:
    """Embed many strings in chunks of `mistral_embed_batch_size`.

    Preserves input order and emits None for any blank input. Designed for the
    backfill script where we may be embedding hundreds of blogs at once.
    """
    materialised = [(t or "").strip()[:MAX_CHARS_PER_INPUT] for t in texts]
    results: List[Optional[List[float]]] = [None] * len(materialised)

    if not is_enabled():
        return results

    # Filter to non-empty inputs but remember their original positions.
    indexed_non_empty = [(i, t) for i, t in enumerate(materialised) if t]
    if not indexed_non_empty:
        return results

    batch_size = max(1, int(settings.mistral_embed_batch_size))
    for start in range(0, len(indexed_non_empty), batch_size):
        chunk = indexed_non_empty[start:start + batch_size]
        vecs = await _embed_chunk([t for _, t in chunk])
        for (orig_idx, _), vec in zip(chunk, vecs):
            results[orig_idx] = vec
    return results
