from django.views.generic import TemplateView
from django.contrib.auth import get_user_model
from ..models import Blog, Playlist, Category

User = get_user_model()


class HomeView(TemplateView):
    template_name = 'blog/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['total_users'] = User.objects.count()
        context['total_blogs'] = Blog.objects.filter(is_published=True).count()
        context['total_playlists'] = Playlist.objects.count()
        context['recent_blogs'] = (
            Blog.objects.filter(is_published=True)
            .order_by('-created_at')
            .select_related('author', 'category')[:6]
        )
        context['top_blogs'] = (
            Blog.objects.filter(is_published=True)
            .order_by('-read_count', '-created_at')
            .select_related('author', 'category')[:3]
        )
        context['featured_playlists'] = (
            Playlist.objects.order_by('-created_at')
            .select_related('author')
            .prefetch_related('blogs')[:4]
        )
        context['featured_users'] = (
            User.objects.order_by('-date_joined')[:6]
        )
        return context


from django.views.generic import CreateView
from django.urls import reverse_lazy
from ..forms import ContactForm
from ..models import ContactEntry

class ContactView(CreateView):
    model = ContactEntry
    form_class = ContactForm
    template_name = 'blog/contact.html'
    
    def get_success_url(self):
        return reverse_lazy('contact') + '?success=1'
