from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from django.db.models import F
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import time
import os
import uuid
from blogs.models import Blog, BlogLike

class JsonPostMixin:
    """Mixin to ensure request is POST and return JSON responses."""
    def dispatch(self, request, *args, **kwargs):
        if request.method != 'POST':
            return JsonResponse({'error': 'Method not allowed'}, status=405)
        return super().dispatch(request, *args, **kwargs)

class ToggleBlogLikeAPI(LoginRequiredMixin, JsonPostMixin, View):
    def post(self, request, slug, *args, **kwargs):
        # Get the blog - minimized query
        blog = get_object_or_404(Blog.objects.only('id', 'likes'), slug=slug)
        user = request.user
        
        # Check if already liked
        like_obj, created = BlogLike.objects.get_or_create(user=user, blog=blog)
        
        if not created:
            # Already liked, so UNLIKE it
            like_obj.delete()
            liked = False
            # Decrement count safely
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') - 1)
            # Calculate new likes without DB hit (approx)
            new_likes = blog.likes - 1
        else:
            # Just created, so it's a LIKE
            liked = True
            # Increment count safely
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') + 1)
            new_likes = blog.likes + 1
            
        return JsonResponse({
            'liked': liked,
            'total_likes': max(0, new_likes) # Prevent negative if something weird happened
        })

class GenerateBlogAPI(LoginRequiredMixin, JsonPostMixin, View):
    def post(self, request, *args, **kwargs):
        # Simulate AI generation
        # In a real scenario, this would call an AI service
        
        dummy_blog_data = {
            "title": "The Future of Web Development with AI",
            "slug": "future-web-development-ai",
            "subtitle": "How Artificial Intelligence is transforming the way we build websites.",
            "excerpt": "Explore the revolutionary impact of AI on modern web development workflows, from code generation to automated testing.",
            "category": "Technology", 
            "content": {
                "introduction": "In the rapidly evolving landscape of technology, Artificial Intelligence (AI) has emerged as a game-changer for web developers. Gone are the days of manual boilerplate coding; today, intelligent tools assist in everything from design to deployment.",
                "conclusion": "As we embrace these new tools, the role of the developer is shifting from coder to architect. The future is bright, and AI is the partner that will help us build it.",
                "sections": [
                    {
                        "id": 101,
                        "type": "text",
                        "title": "The Rise of AI Coding Assistants",
                        "content": "Tools like GitHub Copilot and ChatGPT have revolutionized how developers write code. They suggest snippets, refactor functions, and even debug complex issues in real-time."
                    },
                    {
                        "id": 102,
                        "type": "bullets",
                        "title": "Key Benefits",
                        "items": [
                            "Increased productivity and faster time-to-market",
                            "Reduction in syntax errors and bugs",
                            "Automated documentation generation",
                            "Enhanced creativity by offloading repetitive tasks"
                        ]
                    },
                    {
                        "id": 103,
                        "type": "note",
                        "title": "Important Note",
                        "content": "While AI is powerful, human oversight remains crucial to ensure security, accessibility, and optimal performance."
                    },
                    {
                        "id": 104,
                        "type": "code",
                        "title": "Example: AI Generated Python Code",
                        "language": "python",
                        "content": "def analyze_sentiment(text):\n    # This is a mock AI function\n    return 'Positive' if 'good' in text else 'Neutral'"
                    }
                ]
            }
        }

        return JsonResponse({
            'message': 'Blog generated successfully',
            'blog_data': dummy_blog_data
        })


class UploadImageAPI(LoginRequiredMixin, JsonPostMixin, View):
    def post(self, request, *args, **kwargs):
        if 'image' not in request.FILES:
            return JsonResponse({'error': 'No image provided'}, status=400)
            
        try:
            image_file = request.FILES['image']
            
            # Basic validation
            if not image_file.content_type.startswith('image/'):
                return JsonResponse({'error': 'Invalid file type. Only images are allowed.'}, status=400)
                
            if image_file.size > 5 * 1024 * 1024:  # 5MB limit
                return JsonResponse({'error': 'Image too large (max 5MB)'}, status=400)

            # Generate unique filename
            ext = os.path.splitext(image_file.name)[1]
            if not ext:
                ext = '.jpg' # Default extension
            
            # Secure filename generation
            filename = f"blog_uploads/{uuid.uuid4().hex}{ext}"
            
            # Save file using default storage
            path = default_storage.save(filename, ContentFile(image_file.read()))
            
            # Get URL
            url = default_storage.url(path)
            
            return JsonResponse({'url': url})
            
        except Exception as e:
            # Log the full error in production
            print(f"Error handling upload: {e}") # Replace with logging in prod
            return JsonResponse({'error': 'Upload failed. Please try again.'}, status=500)
