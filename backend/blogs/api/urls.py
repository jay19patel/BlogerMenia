from django.urls import path, include
from rest_framework.routers import DefaultRouter
from blogs.api.views import (
    BlogListCreateView, BlogDetailView, BlogDetailByIdView, UserBlogListView,
    SuggestedBlogListView, RandomRelatedBlogsView, BlogLikeView, CategoryListView, 
    StatsView, ImageUploadView
)


# Keep router only for ContentViewSet if it's still a ViewSet
urlpatterns = [
    # --- Blog URLs ---
    # Static/List views first to avoid collision with slug
    path('blogs/', BlogListCreateView.as_view(), name='blog-list-create'),
    path('blogs/my-blogs/', UserBlogListView.as_view(), name='my-blogs'),
    path('blogs/suggested_blogs/', SuggestedBlogListView.as_view(), name='suggested-blogs'),
    path('blogs/random_related/', RandomRelatedBlogsView.as_view(), name='random-related-blogs'),
    path('blogs/categories/', CategoryListView.as_view(), name='category-list'),
    path('blogs/stats/', StatsView.as_view(), name='stats'),
    
    # Detail views
    path('blogs/id/<int:pk>/', BlogDetailByIdView.as_view(), name='blog-detail-id'),
    path('blogs/<slug:slug>/', BlogDetailView.as_view(), name='blog-detail'),
    path('blogs/<slug:slug>/like/', BlogLikeView.as_view(), name='blog-like'),
    
    # Image Upload
    path('upload-image/', ImageUploadView.as_view(), name='upload-image'),
]
