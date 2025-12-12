from django.views.generic import CreateView, UpdateView, DeleteView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin, PermissionRequiredMixin
from django.urls import reverse_lazy, reverse
from django.shortcuts import redirect
from django.contrib import messages
from blogs.models import Playlist
from blogs.forms import PlaylistForm

class PlaylistCreateView(LoginRequiredMixin, PermissionRequiredMixin, CreateView):
    model = Playlist
    form_class = PlaylistForm
    template_name = "playlist_form.html"
    permission_required = 'blogs.add_playlist'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        form.instance.owner = self.request.user
        messages.success(self.request, "Playlist created successfully!")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse('user-blogs', kwargs={'username': self.request.user.username})

class PlaylistUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Playlist
    form_class = PlaylistForm
    template_name = "playlist_form.html"
    permission_required = 'blogs.change_playlist'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

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

class PlaylistDeleteView(LoginRequiredMixin, PermissionRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Playlist
    template_name = "playlist_confirm_delete.html"
    permission_required = 'blogs.delete_playlist'

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
        return Playlist.objects.get(
            owner__username=self.kwargs.get('username'),
            slug=self.kwargs.get('slug')
        )
