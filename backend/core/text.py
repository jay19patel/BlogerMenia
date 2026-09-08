"""Flatten a structured blog post into plain prose.

Two consumers need this and used to have separate, unequal implementations: the
Gemini metadata prompt (which handled sections) and the search embedding (which
did not, and so indexed structured posts by title alone). One implementation,
used by both.
"""
from typing import Any, Dict, Iterable, List

from django.utils.html import strip_tags


def section_text(section: Dict[str, Any]) -> str:
    """The human-readable prose inside one typed section block."""
    if not isinstance(section, dict):
        return ""

    parts: List[str] = [section.get("title") or ""]
    kind = section.get("type")

    if kind == "bullets":
        parts.extend(str(item) for item in section.get("items") or [])
    elif kind == "table":
        parts.extend(str(header) for header in section.get("headers") or [])
        for row in section.get("rows") or []:
            parts.extend(str(cell) for cell in row or [])
    elif kind == "youtube":
        parts.append(section.get("videoTitle") or "")
        parts.append(section.get("description") or "")
    elif kind == "links":
        for link in section.get("links") or []:
            parts.append((link or {}).get("text") or "")
            parts.append((link or {}).get("description") or "")
    elif kind in ("image", "excalidraw"):
        parts.append(section.get("description") or "")
        parts.append(section.get("caption") or "")
    elif kind == "flowchart":
        for step in section.get("steps") or []:
            parts.append((step or {}).get("title") or "")
            parts.append((step or {}).get("description") or "")
            for branch in (step or {}).get("branches") or []:
                parts.append((branch or {}).get("title") or "")
                parts.append((branch or {}).get("description") or "")
    else:
        # text / note / code / anything unrecognised
        parts.append(strip_tags(section.get("content") or ""))

    return ". ".join(part for part in parts if part)


def sections_text(sections: Iterable[Dict[str, Any]] | None) -> str:
    return "\n".join(filter(None, (section_text(s) for s in sections or [])))


def blog_text(blog, limit: int | None = None) -> str:
    """Every word of a post, structured or legacy, as one string.

    `limit` truncates — both callers cap length, for different reasons (prompt
    size vs. embedding cost).
    """
    parts = [
        blog.title or "",
        getattr(blog.category, "name", "") or "",
        blog.subtitle or "",
        blog.excerpt or "",
        blog.introduction or "",
        strip_tags(blog.content or ""),
        sections_text(blog.sections),
        blog.conclusion or "",
    ]
    text = "\n".join(part for part in parts if part)
    return text[:limit] if limit else text
