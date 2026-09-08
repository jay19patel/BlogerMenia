import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from blog.models import Blog
from core.tasks import RETRY_POLICY, PermanentError, classify

from .services import LinkedInService

logger = logging.getLogger(__name__)
User = get_user_model()


def queue_linkedin_post(user_id: int, blog_id: int) -> bool:
    """Enqueue a share, surviving a broker outage.

    Callers run inside a request; an unreachable Redis must not turn a
    successful save into a 500. Returns False when the job could not be queued
    so the caller can say so instead of silently claiming success.
    """
    try:
        post_to_linkedin_task.delay(user_id, blog_id)
        return True
    except Exception:  # noqa: BLE001 — broker errors have no useful common type
        logger.warning(
            "Could not queue LinkedIn share for blog %s (broker down?)", blog_id, exc_info=True
        )
        return False


@shared_task(bind=True, **RETRY_POLICY)
def post_to_linkedin_task(self, user_id, blog_id):
    """Publish a blog to LinkedIn.

    Idempotent: re-checks `posted_on_linkedin`, so a duplicate dispatch or a
    retry after a partial success never double-posts. Records the post URL on
    the blog itself, since the dispatching request is long gone by then.
    """
    user = User.objects.filter(pk=user_id).first()
    blog = Blog.objects.filter(pk=blog_id).first()
    if user is None or blog is None:
        logger.error("post_to_linkedin_task: user %s or blog %s no longer exists", user_id, blog_id)
        return None

    if blog.posted_on_linkedin:
        logger.info("Blog '%s' already on LinkedIn; skipping.", blog.slug)
        return blog.linkedin_post_url

    # The post-save signal also queues excerpt/tag generation, but that is a
    # separate task with no ordering guarantee against this one — without this,
    # a share dispatched right after creation can beat it and go out with no
    # summary. ensure_metadata is idempotent, so this is a no-op if that task
    # already finished.
    from blog.services import ai_service

    ai_service.ensure_metadata(blog)
    blog.refresh_from_db(fields=['excerpt', 'tags'])

    try:
        url = LinkedInService(user).create_post(blog)
    except Exception as exc:  # noqa: BLE001 — the LinkedIn client raises bare exceptions
        error = classify(exc)
        logger.error("LinkedIn post failed for blog '%s': %s", blog.slug, exc)
        if isinstance(error, PermanentError):
            return None
        raise error from exc

    if url:
        Blog.objects.filter(pk=blog_id).update(posted_on_linkedin=True, linkedin_post_url=url)
    return url
