from django.views.generic import ListView
from blogs.models import Blog, Category
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy, reverse
from django.views.generic import CreateView, DetailView, UpdateView, DeleteView
from blogs.forms import BlogCreateForm
from django.shortcuts import redirect
from django.contrib import messages

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
        
        # Top 3 Playlists by Views
        from blogs.models import Playlist
        from django.db.models import Sum
        
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
    success_url = reverse_lazy("blog-list")

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)



# -------------------------
# User Blog List View (Read-Only)
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

        # Real Playlists
        from blogs.models import Playlist
        
        # In READ-ONLY view, show only PUBLIC playlists
        playlists = Playlist.objects.filter(owner=author, is_public=True).prefetch_related('blogs')
        
        context['playlists'] = playlists

        # Filters
        context['selected_category'] = self.request.GET.get('category', '')
        context['search_query'] = self.request.GET.get('q', '')

        context['total_count'] = self.get_queryset().count()
        
        # Explicitly set edit_mode to False
        context['edit_mode'] = False

        return context


# -------------------------
# User Blog Manage View (Edit Mode)
# -------------------------
class UserBlogManageView(LoginRequiredMixin, UserPassesTestMixin, UserBlogListView):
    template_name = 'blog_list_by_user.html'

    def test_func(self):
        """Ensure only the profile owner can access this view."""
        username = self.kwargs.get('username')
        return self.request.user.username == username

    def handle_no_permission(self):
        """Redirect if user tries to access someone else's manage page."""
        messages.error(self.request, "You can only manage your own profile.")
        return redirect('user-blogs', username=self.kwargs.get('username'))
    
    def get_queryset(self):
        """
        Override UserBlogListView's get_queryset to show ALL blogs (published and drafts)
        since this is the management view for the owner.
        """
        username = self.kwargs.get('username')
        
        # NOTE: base query does NOT filter by isPublished=True here
        queryset = Blog.objects.filter(
            author__username=username
        ).select_related('category', 'author')

        queryset = queryset.order_by('-publishedDate', '-created_at')

        # Filters - reusing search logic
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
        # Call the parent's get_context_data to get all stats/blogs
        context = super().get_context_data(**kwargs)
        
        # Enable Edit Mode
        context['edit_mode'] = True
        
        # In MANAGE view, show ALL playlists (public and private)
        from blogs.models import Playlist
        author = context['filter_author']
        playlists = Playlist.objects.filter(owner=author).prefetch_related('blogs')
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
        from django.shortcuts import get_object_or_404
        from django.http import Http404
        
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
        from django.db.models import F
        Blog.objects.filter(pk=blog.pk).update(views=F('views') + 1)
        
        # Refresh to get updated value (optional, but good for display)
        blog.refresh_from_db()

        return blog

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            from blogs.models import BlogLike
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
