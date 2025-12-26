from django.views.generic import CreateView, UpdateView, DeleteView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy, reverse
from django.shortcuts import redirect
from django.contrib import messages
from blogs.models import Playlist, Blog
from blogs.forms import PlaylistForm

class PlaylistCreateView(LoginRequiredMixin, CreateView):
    model = Playlist
    form_class = PlaylistForm
    template_name = "playlist_form.html"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['user_blogs'] = Blog.objects.filter(author=self.request.user, isPublished=True)
        return context

    def form_valid(self, form):
        form.instance.owner = self.request.user
        messages.success(self.request, "Playlist created successfully!")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse('user-blogs', kwargs={'username': self.request.user.username})

class PlaylistUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Playlist
    form_class = PlaylistForm
    template_name = "playlist_form.html"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['user_blogs'] = Blog.objects.filter(author=self.request.user, isPublished=True)
        context['selected_blog_ids'] = list(self.object.blogs.values_list('id', flat=True))
        return context

    def test_func(self):
        playlist = self.get_object()
        return self.request.user == playlist.owner

    def handle_no_permission(self):
        if not self.request.user.has_perm(self.permission_required):
             messages.error(self.request, "You do not have permission to edit playlists.")
        else:
             messages.error(self.request, "You do not have permission to edit THIS playlist.")
        return redirect('user-blogs', username=self.kwargs.get('username'))

    def get_success_url(self):
        messages.success(self.request, "Playlist updated successfully!")
        return reverse('playlist-detail', kwargs={
            'username': self.object.owner.username,
            'slug': self.object.slug
        })

    def get_object(self, queryset=None):
        return Playlist.objects.get(
            owner__username=self.kwargs.get('username'),
            slug=self.kwargs.get('slug')
        )

class PlaylistDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Playlist
    template_name = "playlist_confirm_delete.html"
    context_object_name = "playlist"

    def test_func(self):
        playlist = self.get_object()
        return self.request.user == playlist.owner

    def handle_no_permission(self):
        messages.error(self.request, "You don't have permission to delete this playlist.")
        return redirect('user-blogs', username=self.kwargs.get('username'))

    def get_success_url(self):
        messages.success(self.request, "Playlist deleted successfully!")
        return reverse('user-blogs', kwargs={'username': self.request.user.username})

    def get_object(self, queryset=None):
        return Playlist.objects.get(
            owner__username=self.kwargs.get('username'),
            slug=self.kwargs.get('slug')
        )

class PlaylistDetailView(DetailView):
    model = Playlist
    template_name = "playlist_detail.html"
    context_object_name = "playlist"

    def get_object(self, queryset=None):
        return Playlist.objects.prefetch_related('blogs').get(
            owner__username=self.kwargs.get('username'),
            slug=self.kwargs.get('slug')
        )
