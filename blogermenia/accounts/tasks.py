import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from blog.models import Blog
from .services import LinkedInService

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def post_to_linkedin_task(self, user_id, blog_id, domain_url):
    """
    Publish a blog to LinkedIn asynchronously.

    Idempotent: re-checks ``posted_on_linkedin`` so a duplicate dispatch (or a
    retry after a partial success) never double-posts. On success it records
    the post URL on the blog itself, since the dispatching request is long
    gone by the time this runs.
    """
    try:
        user = User.objects.get(id=user_id)
        blog = Blog.objects.get(id=blog_id)
    except (User.DoesNotExist, Blog.DoesNotExist) as e:
        logger.error(f"post_to_linkedin_task: {e}")
        return None

    if blog.posted_on_linkedin:
        logger.info(f"Blog '{blog.slug}' already on LinkedIn; skipping.")
        return blog.linkedin_post_url

    service = LinkedInService(user)
    try:
        url = service.create_post(blog, domain_url)
    except Exception as exc:
        logger.error(f"LinkedIn post failed for blog '{blog.slug}': {exc}")
        # Retry transient failures with a backoff; gives up after max_retries.
        raise self.retry(exc=exc)

    if url:
        Blog.objects.filter(id=blog_id).update(
            posted_on_linkedin=True, linkedin_post_url=url
        )
    return url
