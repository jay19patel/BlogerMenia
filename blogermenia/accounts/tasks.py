import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from blog.models import Blog
from .services import LinkedInService

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def post_to_linkedin_task(user_id, blog_id, domain_url):
    try:
        user = User.objects.get(id=user_id)
        blog = Blog.objects.get(id=blog_id)
        
        logger.info(f"Starting Celery task: LinkedIn post for user {user.username}, blog {blog.slug}")
        
        service = LinkedInService(user)
        result = service.create_post(blog, domain_url)
        return result
    except Exception as e:
        logger.error(f"Error in post_to_linkedin_task: {e}")
        return False
