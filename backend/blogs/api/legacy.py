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
from blogs.models import Blog
import mongoengine
from django.http import Http404

class JsonPostMixin:
    """Mixin to ensure request is POST and return JSON responses."""
    def dispatch(self, request, *args, **kwargs):
        if request.method != 'POST':
            return JsonResponse({'error': 'Method not allowed'}, status=405)
        return super().dispatch(request, *args, **kwargs)

class ToggleBlogLikeAPI(LoginRequiredMixin, JsonPostMixin, View):
    def post(self, request, slug, *args, **kwargs):
        # Get the blog 
        blog = Blog.objects(slug=slug).first()
        if not blog:
             raise Http404("Blog not found")

        user_id = request.user.id
        
        # Check if already liked
        if user_id in blog.liked_by:
            # Already liked, so UNLIKE it
            blog.liked_by.remove(user_id)
            liked = False
        else:
            # Just created, so it's a LIKE
            blog.liked_by.append(user_id)
            liked = True
            
        blog.save()
        
        return JsonResponse({
            'liked': liked,
            'total_likes': len(blog.liked_by)
        })


import json
import numpy as np
# from django.db.models import Q # Replace with mongoengine.Q
from asgiref.sync import async_to_sync
from langchain_mistralai import MistralAIEmbeddings
# from blogs.Views.chatapp.service import BlogGeneratorService

# Initialize global service instance to maintain in-memory state (development only)
# For production, SessionManager should use Redis/Database
# BLOG_SERVICE = BlogGeneratorService()
BLOG_SERVICE = None

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
            if BLOG_SERVICE is None:
                 return JsonResponse({'error': 'AI Service unavailable'}, status=503)

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
            blogs = Blog.objects(isPublished=True)

            if query:
                blogs = blogs.filter(
                    (mongoengine.Q(title__icontains=query) |
                     mongoengine.Q(subtitle__icontains=query) |
                     mongoengine.Q(excerpt__icontains=query))
                )

            # Limit results
            # only() selects fields in MongoEngine
            blogs = blogs.only(
                'id', 'title', 'slug', 'thumbnail', 'publishedDate', 'excerpt', 
                'category', 'author_id'
            ).limit(limit)
            
            response_data = []
            for blog in blogs:
                response_data.append({
                    'id': str(blog.id), # ObjectId to str
                    'title': blog.title,
                    'slug': blog.slug,
                    'excerpt': blog.excerpt,
                    'category': blog.category.name if blog.category else None,
                    'thumbnail': blog.thumbnail if blog.thumbnail else None,
                    'publishedDate': blog.publishedDate.isoformat() if blog.publishedDate else None,
                    'author_username': blog.author.username if blog.author else 'Unknown',
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
