from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from ..models import Playlist
from ..forms import PlaylistForm


class PlaylistFormMixin:
    form_class = PlaylistForm
    template_name = 'blog/playlist_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        form = context['form']
        value = form['blogs'].value() or []
        context['selected_blog_ids'] = {
            str(v.pk if hasattr(v, 'pk') else v) for v in value
        }
        context['user_blogs'] = form.fields['blogs'].queryset
        return context


class PlaylistListView(ListView):
    model = Playlist
    template_name = 'blog/playlist_list.html'
    context_object_name = 'playlists'
    paginate_by = 12

    def get_queryset(self):
        # select_related/prefetch avoid per-card queries for author + blog counts.
        return Playlist.objects.select_related('author').prefetch_related('blogs')


class PlaylistDetailView(DetailView):
    model = Playlist
    template_name = 'blog/playlist_detail.html'
    context_object_name = 'playlist'


class PlaylistCreateView(LoginRequiredMixin, PlaylistFormMixin, CreateView):
    model = Playlist
    success_url = reverse_lazy('playlist_list')


class PlaylistUpdateView(LoginRequiredMixin, UserPassesTestMixin, PlaylistFormMixin, UpdateView):
    model = Playlist

    def test_func(self):
        return self.request.user == self.get_object().author

    def get_success_url(self):
        return reverse_lazy('playlist_detail', kwargs={'slug': self.object.slug})


class PlaylistDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Playlist
    template_name = 'blog/playlist_confirm_delete.html'
    success_url = reverse_lazy('playlist_list')

    def test_func(self):
        return self.request.user == self.get_object().author
