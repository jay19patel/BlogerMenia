from django.views.generic import TemplateView
from django.contrib.auth import get_user_model
from ..models import Blog, Playlist

User = get_user_model()


class HomeView(TemplateView):
    template_name = 'blog/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['total_users'] = User.objects.count()
        context['total_blogs'] = Blog.objects.filter(is_published=True).count()
        context['total_playlists'] = Playlist.objects.count()
        context['recent_blogs'] = Blog.objects.filter(is_published=True).order_by('-created_at')[:3]
        return context
