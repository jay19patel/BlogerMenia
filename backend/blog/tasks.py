import logging

from celery import shared_task

from core.tasks import RETRY_POLICY, TransientError

from .models import Blog
from .services import ai_service

logger = logging.getLogger(__name__)


def enqueue(task, *args, **kwargs) -> bool:
    """Dispatch without letting a broker outage break the request that saved.

    See `search.tasks.enqueue` — same reasoning, and the two are kept separate
    only so neither app has to import the other's task module.
    """
    try:
        task.delay(*args, **kwargs)
        return True
    except Exception:  # noqa: BLE001 — broker errors share no useful base class
        logger.warning("Could not enqueue %s%s (broker down?)", task.name, args, exc_info=True)
        return False


@shared_task(**RETRY_POLICY)
def generate_blog_metadata(blog_id):
    """Fill in a blog's excerpt/tags via Gemini if they are missing.

    `ai_service.ensure_metadata` updates via `.update()` (not `.save()`) so this
    never re-triggers the post_save signal that enqueued it, and it swallows
    Gemini errors so callers like the LinkedIn task can fall back gracefully.
    Re-checking the result here is what turns a transient Gemini outage into a
    retry instead of a silently-never-filled-in excerpt.
    """
    blog = Blog.objects.filter(pk=blog_id).first()
    if blog is None:
        return

    ai_service.ensure_metadata(blog)

    if not (blog.excerpt and blog.tags):
        # There may genuinely be nothing to summarise — an empty draft. Only
        # retry when the post actually has text.
        from core.text import blog_text

        if not blog_text(blog).strip():
            logger.info("generate_blog_metadata: blog %s has no content yet", blog_id)
            return
        raise TransientError(f"Gemini metadata generation failed for blog {blog_id}")

@shared_task(**RETRY_POLICY)
def generate_thumbnail_task(blog_id):
    """Generate a placeholder thumbnail if the blog doesn't have an image."""
    blog = Blog.objects.filter(pk=blog_id).first()
    if blog is None or blog.image:
        return

    from core.thumbnail_generator import generate_blog_thumbnail

    title = blog.title
    subtitle = blog.subtitle or f"By {blog.author.username}"
    category = blog.category.name if blog.category else ""
    seed = str(blog.id) + title

    try:
        content_file = generate_blog_thumbnail(title, subtitle, category, seed)
        blog.image.save(content_file.name, content_file, save=False)
        blog.save(update_fields=['image'])
        logger.info("generate_thumbnail_task: generated thumbnail for blog %s", blog_id)
    except Exception as e:
        logger.exception("Failed to generate thumbnail for blog %s", blog_id)
        raise TransientError(f"Thumbnail generation failed for blog {blog_id}") from e
