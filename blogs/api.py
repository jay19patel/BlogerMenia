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


import json
import numpy as np
from django.db.models import Q
from asgiref.sync import async_to_sync
from langchain_mistralai import MistralAIEmbeddings
from blogs.Views.chatapp.service import BlogGeneratorService

# Initialize global service instance to maintain in-memory state (development only)
# For production, SessionManager should use Redis/Database
BLOG_SERVICE = BlogGeneratorService()

class GenerateBlogAPI(LoginRequiredMixin, JsonPostMixin, View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            message = data.get('message')
            session_id = data.get('session_id') or str(uuid.uuid4())
            
            if not message:
                return JsonResponse({'error': 'Message is required'}, status=400)

            # Call the AI service
            # We use the global instance to keep chat history in memory
            response = async_to_sync(BLOG_SERVICE.process_message)(
                message=message,
                session_id=session_id,
                user_id=str(request.user.id),
                username=request.user.username
            )
            
            # Add session_id to response so client can maintain conversation
            response['session_id'] = session_id
            
            # Legacy support: Frontend expects 'blog_data', service returns 'blog_state'
            if 'blog_state' in response:
                response['blog_data'] = response['blog_state']
            
            return JsonResponse(response)
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            print(f"Error in GenerateBlogAPI: {e}")
            return JsonResponse({'error': str(e)}, status=500)


class SearchBlogAPI(JsonPostMixin, View):
    """
    Search blogs using Vector Embeddings (Semantic Search)
    """
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            query = data.get('query')
            limit = data.get('limit', 5)
            
            if not query:
                return JsonResponse({'error': 'Query is required'}, status=400)

            # Standard text-based search
            blogs = Blog.objects.filter(isPublished=True).select_related('category', 'author')

            if query:
                blogs = blogs.filter(
                    Q(title__icontains=query) |
                    Q(subtitle__icontains=query) |
                    Q(excerpt__icontains=query)
                )

            # Limit results
            blogs = blogs.only(
                'id', 'title', 'slug', 'thumbnail', 'publishedDate', 'excerpt', 
                'category__name', 'author__username'
            )[:limit]
            
            response_data = []
            for blog in blogs:
                response_data.append({
                    'id': blog.id,
                    'title': blog.title,
                    'slug': blog.slug,
                    'excerpt': blog.excerpt,
                    'category': blog.category.name if blog.category else None,
                    'thumbnail': blog.thumbnail.url if blog.thumbnail else None,
                    'publishedDate': blog.publishedDate.isoformat() if blog.publishedDate else None,
                    'author_username': blog.author.username,
                    'score': 1.0 # Static score for text match
                })
                
            return JsonResponse({'results': response_data})

        except Exception as e:
            print(f"Error in SearchBlogAPI: {e}")
            return JsonResponse({'error': str(e)}, status=500)


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
