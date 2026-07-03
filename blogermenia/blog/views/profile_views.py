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
    paginate_by = 24

    def get_queryset(self):
        return User.objects.annotate(
            blog_count=Count('blogs', filter=Q(blogs__is_published=True), distinct=True),
            playlist_count=Count('playlists', distinct=True)
        ).order_by('-date_joined')


class UserProfileView(DetailView):
    model = User
    template_name = 'blog/profile.html'
    context_object_name = 'profile_user'
    slug_field = 'username'
    slug_url_kwarg = 'username'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # annotate(like_count) + select_related keep the profile page's blog cards
        # to a fixed number of queries regardless of how many blogs there are.
        context['user_blogs'] = (
            Blog.objects.filter(author=self.object, is_published=True)
            .select_related('category')
            .annotate(like_count=Count('likes'))
        )
        context['user_playlists'] = Playlist.objects.filter(author=self.object)
        context['user_saved_blogs'] = (
            self.object.saved_blogs.filter(is_published=True)
            .select_related('author', 'category')
            .annotate(like_count=Count('likes'))
        )
        context['has_linkedin_oauth'] = self.object.has_linkedin_oauth()
        context['is_own_profile'] = self.request.user == self.object
        return context


class ProfileUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = User
    # 'linkedin_connected' is deliberately NOT here: it reflects a real OAuth
    # connection and must be set by the LinkedIn flow, not self-declared by a user.
    fields = ['first_name', 'last_name', 'bio', 'about', 'profile_picture', 'linkedin_url']
    template_name = 'blog/profile_edit.html'
    slug_field = 'username'
    slug_url_kwarg = 'username'

    def test_func(self):
        return self.request.user.username == self.kwargs['username']

    def get_success_url(self):
        return reverse_lazy('user_profile', kwargs={'username': self.request.user.username})
