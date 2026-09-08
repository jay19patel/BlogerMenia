"""Gemini-powered blog metadata generation (excerpt + tags).

Uses the `google-genai` SDK directly (not LangChain — this is text generation,
not embeddings) with a JSON response schema so parsing is reliable.
"""
import json
import logging
from typing import Any, Dict, Optional

from django.conf import settings
from google import genai
from google.genai import types

from core.text import blog_text

logger = logging.getLogger(__name__)

_MAX_CONTENT_CHARS = 6000

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "excerpt": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["excerpt", "tags"],
}

_PROMPT = (
    "You are an editorial assistant for a tech blog. Given the article below, "
    "write a one or two sentence excerpt (max 200 characters) that hooks a reader, "
    "and pick 3 to 6 concise topical tags (e.g. \"Django\", \"AI\", \"Databases\"). "
    "Respond only with the requested JSON.\n\n"
    "Title: {title}\n\n"
    "Content:\n{content}"
)

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _client


def generate_metadata(blog) -> Optional[Dict[str, Any]]:
    """Ask Gemini for an excerpt + tags for `blog`. Returns None on failure."""
    # Shared with the search embedding, so structured posts are summarised from
    # their sections rather than from an empty legacy `content` field.
    content = blog_text(blog, limit=_MAX_CONTENT_CHARS)
    if not content.strip():
        return None

    try:
        response = _get_client().models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=_PROMPT.format(title=blog.title, content=content),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_RESPONSE_SCHEMA,
            ),
        )
        data = json.loads(response.text)
        return {
            'excerpt': (data.get('excerpt') or '')[:300],
            'tags': [t for t in data.get('tags', []) if isinstance(t, str)][:6],
        }
    except Exception as exc:
        logger.error("Gemini metadata generation failed for blog %s: %s", blog.pk, exc)
        return None


def ensure_metadata(blog):
    """Fill `blog.excerpt`/`blog.tags` in place via Gemini if either is missing.

    Idempotent and safe to call from more than one place (the post-save signal
    AND right before a LinkedIn share) — a blog that already has both is a
    no-op. Writes with `.update()`, never `.save()`, so it cannot re-fire the
    signal that scheduled it.
    """
    if blog.excerpt and blog.tags:
        return blog

    metadata = generate_metadata(blog)
    if metadata is None:
        return blog

    blog.excerpt = blog.excerpt or metadata['excerpt']
    blog.tags = blog.tags or metadata['tags']
    type(blog).objects.filter(pk=blog.pk).update(excerpt=blog.excerpt, tags=blog.tags)
    return blog
