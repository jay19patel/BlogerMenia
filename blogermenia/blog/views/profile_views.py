from django.views.generic import DetailView, ListView
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from ..models import Blog, Playlist

User = get_user_model()

class UserListView(ListView):
    model = User
    template_name = 'blog/user_list.html'
    context_object_name = 'users'

    def get_queryset(self):
        # Annotate users with count of their published blogs and playlists
        return User.objects.annotate(
            blog_count=Count('blogs', filter=Q(blogs__is_published=True), distinct=True),
            playlist_count=Count('playlists', distinct=True)
        ).order_by('-date_joined')

class UserProfileView(DetailView):
    model = User
    template_name = 'blog/profile.html'
    context_object_name = 'profile_user'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Fetch only published blogs for this user
        context['user_blogs'] = Blog.objects.filter(author=self.object, is_published=True).order_by('-created_at')
        context['user_playlists'] = Playlist.objects.filter(author=self.object).order_by('-created_at')
        return context
