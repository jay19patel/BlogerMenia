from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from blogs.models import Blog, BlogLike
from django.db.models import F

class ToggleBlogLikeAPI(LoginRequiredMixin, View):
    def post(self, request, slug, *args, **kwargs):
        # Get the blog
        blog = get_object_or_404(Blog, slug=slug)
        user = request.user
        
        # Check if already liked
        like_obj, created = BlogLike.objects.get_or_create(user=user, blog=blog)
        
        if not created:
            # Already liked, so UNLIKE it
            like_obj.delete()
            liked = False
            # Decrement count safely
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') - 1)
        else:
            # Just created, so it's a LIKE
            liked = True
            # Increment count safely
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') + 1)
            
        # Refresh blog to get current accurate count
        blog.refresh_from_db()
        
        return JsonResponse({
            'liked': liked,
            'total_likes': blog.likes
        })
