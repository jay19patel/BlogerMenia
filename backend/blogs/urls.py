from django.urls import path, include
from rest_framework.routers import DefaultRouter
from blogs.api.views import BlogViewSet, PlaylistViewSet
from blogs.api.content_views import ContentViewSet
from blogs.api import legacy as legacy_api # Keep the old api.py as it had custom views like GenerateBlogAPI

router = DefaultRouter()
router.register(r'blogs', BlogViewSet, basename='blog')
router.register(r'playlists', PlaylistViewSet, basename='playlist')
router.register(r'content', ContentViewSet, basename='content')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)), # This mounts /blogs/ and /playlists/ at the root of the include.
    
    # Custom API endpoints from legacy api.py that we still need (e.g. AI generation)
    # We should ensure these don't conflict or migrate them.
    # The frontend expects /api/generate-blog/ (mapped in my plan to api.generateBlog)
    
    # Wait, the user wants "django ka templates nikal ke". 
    # So I am replacing the old template views.
    
    # Additional API endpoints
    path('chat/generate', legacy_api.GenerateBlogAPI.as_view(), name='generate-blog-api'),
    path('upload-image/', legacy_api.UploadImageAPI.as_view(), name='upload-image-api'),
    
    # Helper for specific playlist by user which client uses: /playlists/user/<username>
    # Logic: The router provides /playlists/ but not /playlists/user/<username>.
    # I'll rely on the router mostly, but the frontend might need updates or I add a path here.
    # Frontend calls: playlists/user/{username}
    path('playlists/user/<str:username>/', PlaylistViewSet.as_view({'get': 'list'}), name='user-playlists'), # Simply list, filtered by username via query param usually, but here we can force filter if we change viewset.
    
    # Actually, the viewset logic:
    # get_queryset filtered by "username" query param if present.
    # So /playlists/?username=jay is better.
    # But to support existing frontend or simplified path:
    
    # Content endpoints for frontend
    # /content/testimonials
    # /content/faqs
    # We can create simple api views for these or just mock them for now/use older logic.
    
]
