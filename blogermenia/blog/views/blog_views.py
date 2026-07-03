import json

from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, DeleteView, View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Count
from django.utils.text import slugify
import requests
from allauth.socialaccount.models import SocialToken
from ..models import Blog, Like, Category, Playlist


class BlogListView(ListView):
    model = Blog
    template_name = 'blog/blog_list.html'
    context_object_name = 'blogs'
    paginate_by = 10

    def get_queryset(self):
        # annotate(like_count=...) resolves {{ blog.like_count }} in the template
        # from this single query instead of one COUNT per blog (N+1).
        qs = (
            Blog.objects.filter(is_published=True)
            .select_related('author', 'category')
            .annotate(like_count=Count('likes'))
        )
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

    def get_queryset(self):
        # select_related avoids extra queries for author/category in the template.
        return Blog.objects.select_related('author', 'category')

    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        obj.register_view(self.request)
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


def _parse_structured_post(request, blog):
    """Apply the structured editor's POST payload onto a Blog instance (unsaved).

    Shared by create and update so the two stay in lock-step. Reads the same
    field names the ``blog_form.html`` editor submits, including the ``sections``
    hidden field (a JSON array) and comma-separated ``tags``. Category is resolved
    by name (created on demand) so the AI-populated free-text category works too.
    """
    post = request.POST
    blog.title = post.get('title', '').strip()
    blog.subtitle = post.get('subtitle', '').strip()
    blog.excerpt = post.get('excerpt', '').strip()
    blog.introduction = post.get('introduction', '').strip()
    blog.conclusion = post.get('conclusion', '').strip()
    blog.content = post.get('content', '').strip()
    blog.is_published = post.get('is_published') in ('on', 'true', '1', 'True')
    blog.featured = post.get('featured') in ('on', 'true', '1', 'True')

    slug = post.get('slug', '').strip()
    if slug:
        blog.slug = slugify(slug)

    blog.tags = [t.strip() for t in post.get('tags', '').split(',') if t.strip()]

    try:
        sections = json.loads(post.get('sections') or '[]')
        blog.sections = sections if isinstance(sections, list) else []
    except (ValueError, TypeError):
        blog.sections = []

    cat_name = post.get('category', '').strip()
    if cat_name:
        blog.category, _ = Category.objects.get_or_create(name=cat_name)
    else:
        blog.category = None

    if request.FILES.get('image'):
        blog.image = request.FILES['image']

    return blog


def _editor_context(user, blog=None):
    return {
        'object': blog,
        'categories': Category.objects.all(),
        'user_playlists': Playlist.objects.filter(author=user),
    }


def _dispatch_linkedin_share(request, blog):
    """Queue an async LinkedIn share if the author opted in via the form checkbox.

    Fire-and-forget: the Celery task records the post URL on the blog when it
    finishes. Guarded so we never queue for an unpublished blog, an already
    shared blog, or a user without a connected LinkedIn account.
    """
    if request.POST.get('post_to_linkedin') != 'on':
        return
    if not (blog.is_published and not blog.posted_on_linkedin and request.user.has_linkedin_oauth()):
        return

    from accounts.tasks import post_to_linkedin_task
    post_to_linkedin_task.delay(request.user.id, blog.id, request.build_absolute_uri('/'))
    messages.info(request, "Your blog is being shared to LinkedIn and will appear shortly.")


class BlogCreateView(LoginRequiredMixin, View):
    template_name = 'blog/blog_form.html'

    def get(self, request):
        return render(request, self.template_name, _editor_context(request.user))

    def post(self, request):
        blog = Blog(author=request.user)
        _parse_structured_post(request, blog)
        if not blog.title:
            ctx = _editor_context(request.user)
            ctx['error'] = 'Title is required.'
            return render(request, self.template_name, ctx)
        blog.save()
        if request.POST.getlist('playlists'):
            blog.playlists.set(request.POST.getlist('playlists'))

        _dispatch_linkedin_share(request, blog)
        return redirect('blog_detail', slug=blog.slug)


class BlogUpdateView(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = 'blog/blog_form.html'

    def get_object(self):
        return get_object_or_404(Blog, slug=self.kwargs['slug'])

    def test_func(self):
        return self.request.user == self.get_object().author

    def get(self, request, slug):
        return render(request, self.template_name, _editor_context(request.user, self.get_object()))

    def post(self, request, slug):
        blog = self.get_object()
        _parse_structured_post(request, blog)
        if not blog.title:
            ctx = _editor_context(request.user, blog)
            ctx['error'] = 'Title is required.'
            return render(request, self.template_name, ctx)
        blog.save()
        blog.playlists.set(request.POST.getlist('playlists'))

        _dispatch_linkedin_share(request, blog)
        return redirect('blog_detail', slug=blog.slug)


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

class BlogShareLinkedInView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        blog = get_object_or_404(Blog, slug=self.kwargs['slug'])
        return self.request.user == blog.author

    def post(self, request, slug):
        blog = get_object_or_404(Blog, slug=slug)
        if not request.user.has_linkedin_oauth():
            messages.error(request, "Please connect your LinkedIn account first.")
            return redirect('blog_detail', slug=blog.slug)
        if not blog.is_published:
            messages.error(request, "Publish the blog before sharing it on LinkedIn.")
            return redirect('blog_detail', slug=blog.slug)
        if blog.posted_on_linkedin:
            messages.info(request, "This blog has already been shared on LinkedIn.")
            return redirect('blog_detail', slug=blog.slug)

        from accounts.tasks import post_to_linkedin_task
        linkedin_url = post_to_linkedin_task(request.user.id, blog.id, request.build_absolute_uri('/'))
        if linkedin_url:
            blog.posted_on_linkedin = True
            blog.linkedin_post_url = linkedin_url
            blog.save()
            messages.success(request, "Successfully shared to LinkedIn!")
        else:
            messages.error(request, "Failed to share on LinkedIn. Check logs.")
        return redirect('blog_detail', slug=blog.slug)

