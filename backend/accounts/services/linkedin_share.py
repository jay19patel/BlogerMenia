"""Composing and publishing a blog share on LinkedIn.

Two things live here that used to be one inline payload in `LinkedInService`:
the *text* of the share, and the *document* attached to it.

**The text** is deliberately short. A share that pastes the whole excerpt is
truncated by LinkedIn's "…see more" fold anyway, so the useful shape is a
title, one or two sentences, the link, and the post's own tags as hashtags.

**The document** is the same PDF the author can download from the post page,
uploaded through LinkedIn's Documents API so the share renders as a readable
carousel in the feed rather than a bare link. The blog URL stays in the
commentary text, which LinkedIn auto-links — a post can carry either a document
or a link preview, not both, so the link has to live in the words.

Every step of the document path can fail without the share failing: the caller
falls back to a plain text post. A share that reaches somebody's network
without its PDF is a worse outcome than one with it, and a much better outcome
than none at all.
"""
import logging
import re

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# LinkedIn's "little text" format reserves these; they reach the feed literally
# only if escaped. `#` is deliberately absent — it is what makes a hashtag.
_RESERVED = re.compile(r"([\\|{}@\[\]()<>*_~])")

# Past this the feed shows "…see more" and the rest is a scroll away, so the
# description is cut to something that survives the fold.
DESCRIPTION_LIMIT = 220
MAX_HASHTAGS = 5
# LinkedIn rejects a document title longer than this.
DOCUMENT_TITLE_LIMIT = 100
UPLOAD_TIMEOUT = 30


def escape_commentary(text: str) -> str:
    """Escape the characters LinkedIn's post commentary treats as markup."""
    return _RESERVED.sub(r"\\\1", text)


def hashtag(tag: str) -> str:
    """`"Next.js"` → `"#NextJS"`.

    A hashtag may only hold letters, digits and underscores; LinkedIn silently
    ends the tag at the first character that is not one, so `#Next.js` would
    link `#Next` and leave `.js` as loose text.
    """
    words = re.findall(r"[A-Za-z0-9]+", str(tag))
    if not words:
        return ""
    # Single lowercase words are capitalised; anything already mixed-case keeps
    # its own casing, so "AI" and "PostgreSQL" survive intact.
    parts = [word if not word.islower() else word.capitalize() for word in words]
    return "#" + "".join(parts)


def _short_description(blog) -> str:
    """One or two sentences. The excerpt if Gemini wrote one, else the subtitle."""
    text = " ".join((blog.excerpt or blog.subtitle or "").split())
    if len(text) <= DESCRIPTION_LIMIT:
        return text

    # Cut on a word boundary — a description that ends mid-word reads like a
    # bug, not a teaser.
    cut = text[:DESCRIPTION_LIMIT].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return f"{cut}…"


def build_commentary(blog, blog_url: str) -> str:
    """The share text: title, short description, link, hashtags."""
    blocks = [blog.title.strip()]

    description = _short_description(blog)
    if description:
        blocks.append(description)

    blocks.append(f"Read the full post: {blog_url}")

    tags = [hashtag(tag) for tag in (blog.tags or [])]
    tags = [tag for tag in tags if tag][:MAX_HASHTAGS]
    if tags:
        blocks.append(" ".join(tags))

    return escape_commentary("\n\n".join(blocks))


# ------------------------------------------------------------------- document


def _api_version() -> str:
    return getattr(settings, "LINKEDIN_API_VERSION", "202405")


def upload_document(access_token: str, author_urn: str, filename: str, data: bytes) -> str:
    """Upload `data` as a LinkedIn document and return its URN.

    Two calls: an action that reserves an upload slot and hands back a URL, then
    a plain PUT of the bytes to it. Raises on failure — the caller decides
    whether that costs the whole share or only its attachment.
    """
    from linkedin_api.clients.restli.client import RestliClient

    client = RestliClient()
    initialised = client.action(
        resource_path="/documents",
        action_name="initializeUpload",
        action_params={"initializeUploadRequest": {"owner": author_urn}},
        access_token=access_token,
        version_string=_api_version(),
    )

    value = (initialised.value or {}).get("value") or {}
    upload_url = value.get("uploadUrl")
    document_urn = value.get("document")
    if not upload_url or not document_urn:
        raise RuntimeError(f"initializeUpload returned no upload target: {initialised.value}")

    response = requests.put(
        upload_url,
        data=data,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/octet-stream",
        },
        timeout=UPLOAD_TIMEOUT,
    )
    response.raise_for_status()

    logger.info("Uploaded %s (%d bytes) as %s", filename, len(data), document_urn)
    return document_urn


def create_post(access_token: str, author_urn: str, commentary: str, *,
                document_urn: str | None = None, document_title: str = "") -> str:
    """Publish a post, optionally with a document attached. Returns its URN."""
    from linkedin_api.clients.restli.client import RestliClient

    entity = {
        "author": author_urn,
        "commentary": commentary,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }

    if document_urn:
        entity["content"] = {
            "media": {
                "id": document_urn,
                # Shown as the document's name on the card in the feed.
                "title": (document_title or "Article")[:DOCUMENT_TITLE_LIMIT],
            }
        }

    response = RestliClient().create(
        resource_path="/posts",
        entity=entity,
        access_token=access_token,
        version_string=_api_version(),
    )
    return response.entity_id


def post_url(urn: str) -> str:
    return f"https://www.linkedin.com/feed/update/{urn}/"
