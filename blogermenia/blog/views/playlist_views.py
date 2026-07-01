from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from ..models import Playlist


class PlaylistListView(ListView):
    model = Playlist
    template_name = 'blog/playlist_list.html'
    context_object_name = 'playlists'
    ordering = ['-created_at']


class PlaylistDetailView(DetailView):
    model = Playlist
    template_name = 'blog/playlist_detail.html'
    context_object_name = 'playlist'


class PlaylistCreateView(LoginRequiredMixin, CreateView):
    model = Playlist
    fields = ['title', 'description', 'image']
    template_name = 'blog/playlist_form.html'
    success_url = reverse_lazy('playlist_list')

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)


class PlaylistUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Playlist
    fields = ['title', 'description', 'image']
    template_name = 'blog/playlist_form.html'

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def test_func(self):
        return self.request.user == self.get_object().author

    def get_success_url(self):
        return reverse_lazy('playlist_detail', kwargs={'pk': self.object.pk})


class PlaylistDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Playlist
    template_name = 'blog/playlist_confirm_delete.html'
    success_url = reverse_lazy('playlist_list')

    def test_func(self):
        return self.request.user == self.get_object().author
