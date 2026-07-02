from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView, View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse
from ..models import Blog, Like, Category
from ..signals import blog_viewed


class BlogListView(ListView):
    model = Blog
    template_name = 'blog/blog_list.html'
    context_object_name = 'blogs'
    paginate_by = 10

    def get_queryset(self):
        qs = Blog.objects.filter(is_published=True).order_by('-created_at').select_related('author', 'category')
        slug = self.request.GET.get('category')
        if slug:
            qs = qs.filter(category__slug=slug)
        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        slug = self.request.GET.get('category')
        if slug:
            context['current_category'] = Category.objects.filter(slug=slug).first()
        return context


class BlogDetailView(DetailView):
    model = Blog
    template_name = 'blog/blog_detail.html'
    context_object_name = 'blog'

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        blog_viewed.send(sender=self.__class__, blog=obj, request=self.request)
        return obj

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['user_liked'] = self.object.is_liked_by(self.request.user)
        context['user_saved'] = self.request.user.is_authenticated and self.request.user.saved_blogs.filter(pk=self.object.pk).exists()
        context['like_count'] = self.object.like_count()
        context['related_blogs'] = (
            Blog.objects
            .filter(is_published=True)
            .exclude(pk=self.object.pk)
            .order_by('-created_at')
            .select_related('author')[:4]
        )
        return context


class BlogCreateView(LoginRequiredMixin, CreateView):
    model = Blog
    fields = ['title', 'content', 'image', 'category', 'playlists', 'is_published']
    template_name = 'blog/blog_form.html'
    success_url = reverse_lazy('blog_list')

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)


class BlogUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Blog
    fields = ['title', 'content', 'image', 'category', 'playlists', 'is_published']
    template_name = 'blog/blog_form.html'

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def test_func(self):
        return self.request.user == self.get_object().author

    def get_success_url(self):
        return reverse_lazy('blog_detail', kwargs={'slug': self.object.slug})


class BlogDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Blog
    template_name = 'blog/blog_confirm_delete.html'
    success_url = reverse_lazy('blog_list')

    def test_func(self):
        return self.request.user == self.get_object().author


class BlogLikeView(LoginRequiredMixin, View):
    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug, is_published=True)
        like, created = Like.objects.get_or_create(blog=blog, user=request.user)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'liked': liked, 'like_count': blog.like_count()})
        return redirect('blog_detail', slug=blog.slug)


class BlogSaveView(LoginRequiredMixin, View):
    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug, is_published=True)
        user = request.user
        
        if user.saved_blogs.filter(pk=blog.pk).exists():
            user.saved_blogs.remove(blog)
            saved = False
        else:
            user.saved_blogs.add(blog)
            saved = True
            
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'saved': saved})
        return redirect('blog_detail', slug=blog.slug)
