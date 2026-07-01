from django.dispatch import Signal, receiver
from django.db.models import F

# Custom signal fired when a blog post is viewed
blog_viewed = Signal()


@receiver(blog_viewed)
def increment_read_count(sender, blog, request, **kwargs):
    # Skip author's own views and unauthenticated users to avoid inflated counts
    if not request.user.is_authenticated or request.user != blog.author:
        type(blog).objects.filter(pk=blog.pk).update(read_count=F('read_count') + 1)
