"""Gemini-powered blog metadata generation (excerpt + tags).

Uses the `google-genai` SDK directly (not LangChain — this is text generation,
not embeddings) with a JSON response schema so parsing is reliable.
"""
import json
import logging
from typing import Any, Dict, Optional

from django.conf import settings
from django.utils.html import strip_tags
from google import genai
from google.genai import types

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


def _section_text(section: Dict[str, Any]) -> str:
    """Pull the human-readable text out of one typed section block."""
    parts = [section.get('title', '')]
    kind = section.get('type')
    if kind in ('text', 'note', 'code', None) or kind not in (
        'bullets', 'table', 'youtube', 'links', 'image', 'flowchart',
    ):
        parts.append(strip_tags(section.get('content', '')))
    elif kind == 'bullets':
        parts.extend(section.get('items', []))
    elif kind == 'table':
        parts.extend(section.get('headers', []))
        for row in section.get('rows', []):
            parts.extend(str(cell) for cell in row)
    elif kind == 'youtube':
        parts.append(section.get('videoTitle', ''))
        parts.append(section.get('description', ''))
    elif kind == 'links':
        for link in section.get('links', []):
            parts.append(link.get('text', ''))
            parts.append(link.get('description', ''))
    elif kind == 'image':
        parts.append(section.get('description', ''))
    elif kind == 'flowchart':
        for step in section.get('steps', []):
            parts.append(step.get('title', ''))
            parts.append(step.get('description', ''))
            for branch in step.get('branches', []):
                parts.append(branch.get('title', ''))
                parts.append(branch.get('description', ''))
    return '. '.join(p for p in parts if p)


def _build_article_text(blog) -> str:
    parts = [blog.subtitle, blog.introduction, strip_tags(blog.content or '')]
    parts.extend(_section_text(s) for s in (blog.sections or []))
    parts.append(blog.conclusion)
    return '\n'.join(p for p in parts if p)[:_MAX_CONTENT_CHARS]


def generate_metadata(blog) -> Optional[Dict[str, Any]]:
    """Ask Gemini for an excerpt + tags for `blog`. Returns None on failure."""
    content = _build_article_text(blog)
    if not content:
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
    except Exception as e:
        logger.error(f"Gemini metadata generation failed for blog {blog.pk}: {e}")
        return None


def ensure_metadata(blog):
    """Fill `blog.excerpt`/`blog.tags` in place via Gemini if either is missing.

    Idempotent and safe to call from multiple places (the post-save signal AND
    right before a LinkedIn share) — a blog that already has both is a no-op.
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
