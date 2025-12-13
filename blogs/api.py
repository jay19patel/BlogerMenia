from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from blogs.models import Blog, BlogLike
from django.db.models import F

class ToggleBlogLikeAPI(LoginRequiredMixin, View):
    def post(self, request, slug, *args, **kwargs):
        # Get the blog
        blog = get_object_or_404(Blog, slug=slug)
        user = request.user
        
        # Check if already liked
        like_obj, created = BlogLike.objects.get_or_create(user=user, blog=blog)
        
        if not created:
            # Already liked, so UNLIKE it
            like_obj.delete()
            liked = False
            # Decrement count safely
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') - 1)
        else:
            # Just created, so it's a LIKE
            liked = True
            # Increment count safely
            Blog.objects.filter(pk=blog.pk).update(likes=F('likes') + 1)
            
        # Refresh blog to get current accurate count
        blog.refresh_from_db()
        
        return JsonResponse({
            'liked': liked,
            'total_likes': blog.likes
        })

class GenerateBlogAPI(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        # Simulate AI generation with a dummy response
        import time
        # time.sleep(1) # Optional delay to simulate processing but making it fast for user experience

        dummy_blog_data = {
            "title": "The Future of Web Development with AI",
            "slug": "future-web-development-ai",
            "subtitle": "How Artificial Intelligence is transforming the way we build websites.",
            "excerpt": "Explore the revolutionary impact of AI on modern web development workflows, from code generation to automated testing.",
            "category": "Technology", # The frontend might need to handle this if it expects an ID, but for now sending text is fine as per current form handling
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


class UploadImageAPI(LoginRequiredMixin, View):
    def post(self, request, *args, **kwargs):
        if 'image' not in request.FILES:
            return JsonResponse({'error': 'No image provided'}, status=400)
            
        try:
            image_file = request.FILES['image']
            
            # Basic validation
            if not image_file.content_type.startswith('image/'):
                return JsonResponse({'error': 'Invalid file type'}, status=400)
                
            if image_file.size > 5 * 1024 * 1024:  # 5MB limit
                return JsonResponse({'error': 'Image too large (max 5MB)'}, status=400)

            # We need to save this file somewhere to get a URL.
            # Ideally, this should go to a specific Media model or folder.
            # For now, we will use Django's default storage system manually 
            # or rely on a helper if we had one.
            # Since we don't have a dedicated "SectionImage" model in the prompt, 
            # we will save it using FileSystemStorage to 'blog_uploads/'
            
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile
            import os
            import uuid
            
            # Generate unique filename
            ext = os.path.splitext(image_file.name)[1]
            if not ext:
                ext = '.jpg'
            filename = f"blog_uploads/{uuid.uuid4()}{ext}"
            
            # Save file
            path = default_storage.save(filename, ContentFile(image_file.read()))
            
            # Get URL
            url = default_storage.url(path)
            
            return JsonResponse({'url': url})
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
