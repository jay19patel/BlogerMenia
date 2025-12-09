from django.views.generic import ListView
from blogs.models import Blog, Category
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView, DetailView
from blogs.forms import BlogCreateForm

# -------------------------
# Global Blog List View
# -------------------------
from django.views.generic import ListView
from django.db.models import Q
from blogs.models import Blog, Category

class BlogListView(ListView):
    model = Blog
    template_name = 'blog_list.html'
    context_object_name = 'blogs'
    paginate_by = 6 

    def get_queryset(self):
        queryset = Blog.objects.filter(isPublished=True).select_related('category', 'author')
        queryset = queryset.order_by('-publishedDate', '-created_at')

        # Search filter
        search = self.request.GET.get('q', '').strip()
        category_slug = self.request.GET.get('category', '').strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(subtitle__icontains=search) |
                Q(excerpt__icontains=search)
            )

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        return queryset.distinct()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Categories for filter bar (optional)
        context['categories'] = Category.objects.all().order_by('name')
        context['selected_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')

        # Total count for info
        context['total_count'] = self.get_queryset().count()

        return context



# -------------------------
# Blog Create View
# -------------------------
class BlogCreateView(LoginRequiredMixin, CreateView):
    model = Blog
    form_class = BlogCreateForm
    template_name = "blog_create.html"
    success_url = reverse_lazy("blog-list")

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)


# -------------------------
# User Blog List View
# -------------------------
class UserBlogListView(ListView):
    model = Blog
    template_name = 'blog_list_by_user.html'
    context_object_name = 'blogs'
    paginate_by = 9

    def get_queryset(self):
        username = self.kwargs.get('username')

        queryset = Blog.objects.filter(
            author__username=username,
            isPublished=True
        ).select_related('category', 'author')

        queryset = queryset.order_by('-publishedDate', '-created_at')

        # Filters
        search = self.request.GET.get('q', '').strip()
        category_slug = self.request.GET.get('category', '').strip()

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(subtitle__icontains=search) |
                Q(excerpt__icontains=search)
            )

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        return queryset.distinct()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Author details
        username = self.kwargs.get('username')
        User = get_user_model()
        author = User.objects.get(username=username)

        context['filter_author'] = author

        # User Stats
        from django.db.models import Sum
        total_blogs = Blog.objects.filter(author=author, isPublished=True).count()
        total_views = Blog.objects.filter(author=author, isPublished=True).aggregate(Sum('views'))['views__sum'] or 0
        total_likes = Blog.objects.filter(author=author, isPublished=True).aggregate(Sum('likes'))['likes__sum'] or 0

        context['user_stats'] = {
            'blog_count': total_blogs,
            'total_views': total_views,
            'total_likes': total_likes,
            'member_since': author.date_joined,
        }

        # Categories used by this author
        author_categories = Category.objects.filter(
            blogs__author=author,
            blogs__isPublished=True
        ).distinct().order_by('name')
        context['categories'] = author_categories

        # Get unique category names for display
        context['category_names'] = list(author_categories.values_list('name', flat=True))

        # Dummy Playlists (for future implementation)
        context['playlists'] = [
            {
                'id': 1,
                'name': 'Web Development Essentials',
                'slug': 'web-development-essentials',
                'description': 'A curated collection of articles covering modern web development practices and techniques.',
                'cover_image': None,
                'blog_count': 12,
                'total_views': 3420,
                'total_likes': 287,
            },
            {
                'id': 2,
                'name': 'Python Programming',
                'slug': 'python-programming',
                'description': 'Master Python from basics to advanced concepts with this comprehensive playlist.',
                'cover_image': None,
                'blog_count': 8,
                'total_views': 2150,
                'total_likes': 198,
            },
            {
                'id': 3,
                'name': 'Data Science Journey',
                'slug': 'data-science-journey',
                'description': 'Explore the world of data science, machine learning, and analytics.',
                'cover_image': None,
                'blog_count': 15,
                'total_views': 4890,
                'total_likes': 456,
            },
        ]

        # Filters
        context['selected_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')

        context['total_count'] = self.get_queryset().count()

        return context


# -------------------------
# Blog Detail View
# -------------------------
class BlogDetailView(DetailView):
    model = Blog
    template_name = 'blog_detail.html'
    context_object_name = 'blog'

    def get_object(self, queryset=None):
        username = self.kwargs.get('username')
        slug = self.kwargs.get('slug')

        return Blog.objects.select_related(
            'category', 'author'
        ).get(
            author__username=username,
            slug=slug
        )
