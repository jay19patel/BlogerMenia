from django.views.generic import TemplateView, CreateView
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.urls import reverse_lazy

from ..models import Blog, Playlist, ContactEntry
from ..forms import ContactForm

User = get_user_model()


class HomeView(TemplateView):
    template_name = 'blog/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['total_users'] = User.objects.count()
        context['total_blogs'] = Blog.objects.filter(is_published=True).count()
        context['total_playlists'] = Playlist.objects.count()
        # annotate(like_count) so the template's {{ blog.like_count }} is free.
        context['recent_blogs'] = (
            Blog.objects.filter(is_published=True)
            .select_related('author', 'category')
            .annotate(like_count=Count('likes'))[:6]
        )
        context['top_blogs'] = (
            Blog.objects.filter(is_published=True)
            .order_by('-read_count', '-created_at')
            .select_related('author', 'category')
            .annotate(like_count=Count('likes'))[:3]
        )
        context['featured_playlists'] = (
            Playlist.objects.select_related('author')
            .prefetch_related('blogs')[:4]
        )
        context['featured_users'] = User.objects.order_by('-date_joined')[:6]
        return context


class ContactView(CreateView):
    model = ContactEntry
    form_class = ContactForm
    template_name = 'blog/contact.html'

    def get_success_url(self):
        return reverse_lazy('contact') + '?success=1'
