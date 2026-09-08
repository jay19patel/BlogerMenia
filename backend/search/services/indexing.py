"""Recording the outcome of an indexing attempt on the blog row itself.

Without this a failed embedding is indistinguishable from a successful one:
the post simply never turns up in search, and neither the author nor an admin
can tell why. Every write here uses `.update()` rather than `.save()` so it
never re-fires the post_save signal that scheduled the indexing in the first
place.
"""
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


def record_success(blog_id: int, text_hash: str) -> None:
    from blog.models import Blog, EmbeddingStatus

    Blog.objects.filter(pk=blog_id).update(
        embedding_status=EmbeddingStatus.INDEXED,
        embedding_error='',
        embedding_hash=text_hash,
        embedded_at=timezone.now(),
    )


def record_failure(blog_id: int, error: BaseException) -> None:
    from blog.models import Blog, EmbeddingStatus

    from core.tasks import PermanentError

    # "Nothing to index" is a permanent, expected state for an empty draft —
    # it is not the same thing as Gemini being unreachable, and marking it
    # `failed` would keep the sweep retrying it forever.
    status = (
        EmbeddingStatus.SKIPPED
        if isinstance(error, PermanentError) and 'no text to index' in str(error)
        else EmbeddingStatus.FAILED
    )
    Blog.objects.filter(pk=blog_id).update(
        embedding_status=status,
        embedding_error=str(error)[:500],
    )


def unchanged_since_last_index(blog) -> bool:
    """True when nothing that feeds the embedding has changed.

    Repeated saves used to trigger a full (billed) re-embedding each time, even
    when the author only toggled a checkbox.
    """
    from core.text import blog_text

    from .search_service import SearchService

    if not blog.embedding_hash:
        return False
    current = blog_text(blog, limit=8000)
    return SearchService.text_hash(current) == blog.embedding_hash
