from django.views.generic import DetailView, ListView, UpdateView
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from django.db.models import Count, Q
from ..models import Blog, Playlist

User = get_user_model()


class UserListView(ListView):
    model = User
    template_name = 'blog/user_list.html'
    context_object_name = 'users'

    def get_queryset(self):
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
        context['user_blogs'] = Blog.objects.filter(
            author=self.object, is_published=True
        ).order_by('-created_at')
        context['user_playlists'] = Playlist.objects.filter(
            author=self.object
        ).order_by('-created_at')
        context['has_linkedin_oauth'] = self.object.has_linkedin_oauth()
        context['is_own_profile'] = self.request.user == self.object
        return context


class ProfileUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = User
    fields = ['first_name', 'last_name', 'bio', 'about', 'profile_picture', 'linkedin_url']
    template_name = 'blog/profile_edit.html'

    def test_func(self):
        return self.request.user.pk == self.kwargs['pk']

    def get_success_url(self):
        return reverse_lazy('user_profile', kwargs={'pk': self.request.user.pk})
