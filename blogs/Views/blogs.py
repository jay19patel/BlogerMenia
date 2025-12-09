from django.views.generic import ListView
from blogs.models import Blog, Category, Tag
from django.db.models import Q

class BlogListView(ListView):
    model = Blog
    template_name = 'blog_list.html'
    context_object_name = 'blogs'
    paginate_by = 5   # --- ALWAYS SHOW 5 items ---

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.GET.get('q')
        category_slug = self.request.GET.get('category')
        tag_slug = self.request.GET.get('tag')

        # SEARCH
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(subtitle__icontains=search) |
                Q(excerpt__icontains=search)
            )

        # CATEGORY FILTER (slug)
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        # TAG FILTER (slug)
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)

        return queryset.distinct()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context['categories'] = Category.objects.all()
        context['tags'] = Tag.objects.all()

        context['selected_category'] = self.request.GET.get('category')
        context['selected_tag'] = self.request.GET.get('tag')
        context['search_query'] = self.request.GET.get('q')

        return context


# blogs/views.py
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView
from blogs.models import Blog
from blogs.forms import BlogCreateForm

class BlogCreateView(LoginRequiredMixin, CreateView):
    model = Blog
    form_class = BlogCreateForm
    template_name = "blog_create.html"
    success_url = reverse_lazy("blog-list")  # redirect after creation

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)




