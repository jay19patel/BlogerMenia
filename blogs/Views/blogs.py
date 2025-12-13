from django.views.generic import ListView, CreateView, DetailView, UpdateView, DeleteView
from django.db.models import Q, Sum, F
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy, reverse
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.http import Http404

from blogs.models import Blog, Category, Playlist, BlogLike
from blogs.forms import BlogCreateForm

# Cache the public blog list for 15 minutes
@method_decorator(cache_page(60 * 15), name='dispatch')
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

        # Categories for filter bar (optimally fetched)
        context['categories'] = Category.objects.all().order_by('name')
        context['selected_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')

        # Total count for info
        context['total_count'] = self.get_queryset().count()
        
        # Top 3 Playlists by Views - Optimized
        # Annotate playlists with sum of views of their blogs, order by that sum
        top_playlists = Playlist.objects.filter(is_public=True).annotate(
            total_views=Sum('blogs__views')
        ).order_by('-total_views')[:3]
        
        context['top_playlists'] = top_playlists

        return context



# -------------------------
# Blog Create View
# -------------------------
class BlogCreateView(LoginRequiredMixin, CreateView):
    model = Blog
    form_class = BlogCreateForm
    template_name = "blog_create.html"
    success_url = reverse_lazy("blogs-list")

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def get_success_url(self):
        return reverse('user-blogs', kwargs={'username': self.request.user.username})



# -------------------------
# User Blog List Mixin (Shared Logic)
# -------------------------
class UserBlogListMixin(ListView):
    model = Blog
    template_name = 'blog_list_by_user.html'
    context_object_name = 'blogs'
    paginate_by = 9
    
    def get_user_username(self):
        return self.kwargs.get('username')

    def get_base_queryset(self):
        # To be overridden by subclasses or handled here with logic
        username = self.get_user_username()
        return Blog.objects.filter(author__username=username).select_related('category', 'author')

    def get_queryset(self):
        queryset = self.get_base_queryset()
        
        # Apply sorting
        if hasattr(self, 'ordering_field'):
             queryset = queryset.order_by(self.ordering_field, '-created_at')
        else:
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

        username = self.get_user_username()
        User = get_user_model()
        author = get_object_or_404(User, username=username)

        context['filter_author'] = author

        # We want stats for PUBLISHED blogs only, almost always
        published_blogs = Blog.objects.filter(author=author, isPublished=True)
        stats = published_blogs.aggregate(
            total_views=Sum('views'),
            total_likes=Sum('likes')
        )
        
        context['user_stats'] = {
            'blog_count': published_blogs.count(),
            'total_views': stats['total_views'] or 0,
            'total_likes': stats['total_likes'] or 0,
            'member_since': author.date_joined,
        }

        # Categories used by this author
        author_categories = Category.objects.filter(
            blogs__author=author,
            blogs__isPublished=True
        ).distinct().order_by('name')
        context['categories'] = author_categories
        context['category_names'] = list(author_categories.values_list('name', flat=True))

        # Filters
        context['selected_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')
        context['total_count'] = self.get_queryset().count()
        
        return context


# -------------------------
# User Blog List View (Read-Only)
# -------------------------
class UserBlogListView(UserBlogListMixin):
    
    def get_base_queryset(self):
        # Public view: Only published blogs
        return super().get_base_queryset().filter(isPublished=True)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Real Playlists - Public only
        playlists = Playlist.objects.filter(
            owner=context['filter_author'], 
            is_public=True
        ).prefetch_related('blogs')
        
        context['playlists'] = playlists
        context['edit_mode'] = False

        return context


# -------------------------
# User Blog Manage View (Edit Mode)
# -------------------------
class UserBlogManageView(LoginRequiredMixin, UserPassesTestMixin, UserBlogListMixin):
    ordering_field = '-created_at' # Manage view shows newest created first (including drafts)

    def test_func(self):
        """Ensure only the profile owner can access this view."""
        return self.request.user.username == self.get_user_username()

    def handle_no_permission(self):
        """Redirect if user tries to access someone else's manage page."""
        messages.error(self.request, "You can only manage your own profile.")
        return redirect('user-blogs', username=self.kwargs.get('username'))
    
    def get_base_queryset(self):
        # Manage view: All blogs (published and drafts)
        # Note: Base mixin already selects by author
        return super().get_base_queryset()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Enable Edit Mode
        context['edit_mode'] = True
        
        # In MANAGE view, show ALL playlists (public and private)
        playlists = Playlist.objects.filter(
            owner=context['filter_author']
        ).prefetch_related('blogs')
        
        context['playlists'] = playlists
        
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
        
        # Get the blog first
        
        blog = get_object_or_404(
            Blog.objects.select_related('category', 'author'),
            author__username=username,
            slug=slug
        )
        
        # Access Control logic
        if not blog.isPublished:
            # If not published, ONLY the author can see it
            if self.request.user != blog.author:
                raise Http404("Blog not found or not published.")
        
        # Increment view count
        Blog.objects.filter(pk=blog.pk).update(views=F('views') + 1)
        
        # Refresh to get updated value (optional, but good for display)
        blog.refresh_from_db()

        return blog

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            context['user_has_liked'] = BlogLike.objects.filter(user=self.request.user, blog=self.object).exists()
        else:
            context['user_has_liked'] = False
        return context


# -------------------------
# Blog Update View
# -------------------------
class BlogUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Blog
    form_class = BlogCreateForm
    template_name = "blog_update.html"

    def get_object(self, queryset=None):
        username = self.kwargs.get('username')
        slug = self.kwargs.get('slug')

        return Blog.objects.get(
            author__username=username,
            slug=slug
        )

    def test_func(self):
        """Check if the current user is the author of the blog"""
        blog = self.get_object()
        return self.request.user == blog.author

    def handle_no_permission(self):
        """Redirect if user doesn't have permission"""
        messages.error(self.request, "You don't have permission to edit this blog.")
        return redirect('user-blogs', username=self.kwargs.get('username'))

    def get_success_url(self):
        """Redirect to the blog detail page after successful update"""
        messages.success(self.request, "Blog updated successfully!")
        return reverse('blog-detail', kwargs={
            'username': self.object.author.username,
            'slug': self.object.slug
        })


# -------------------------
# Blog Delete View
# -------------------------
class BlogDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Blog
    template_name = "blog_confirm_delete.html"

    def get_object(self, queryset=None):
        username = self.kwargs.get('username')
        slug = self.kwargs.get('slug')

        return Blog.objects.get(
            author__username=username,
            slug=slug
        )

    def test_func(self):
        """Check if the current user is the author of the blog"""
        blog = self.get_object()
        return self.request.user == blog.author

    def handle_no_permission(self):
        """Redirect if user doesn't have permission"""
        messages.error(self.request, "You don't have permission to delete this blog.")
        return redirect('user-blogs', username=self.kwargs.get('username'))

    def get_success_url(self):
        """Redirect to user's blog list after successful deletion"""
        messages.success(self.request, "Blog deleted successfully!")
        return reverse('user-blogs', kwargs={
            'username': self.request.user.username
        })
