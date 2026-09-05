from django.urls import path
from blog.api.views import (
    BlogListView, BlogDetailView, BlogLikeToggleView,
    CategoryListView, PlaylistListView, PlaylistDetailView,
    ContactCreateView, BlogSaveToggleView, BlogShareLinkedInView
)

urlpatterns = [
    path('blogs/', BlogListView.as_view(), name='api_blog_list'),
    path('blogs/<slug:slug>/', BlogDetailView.as_view(), name='api_blog_detail'),
    path('blogs/<slug:slug>/like/', BlogLikeToggleView.as_view(), name='api_blog_like'),
    path('blogs/<slug:slug>/save/', BlogSaveToggleView.as_view(), name='api_blog_save'),
    path('blogs/<slug:slug>/share-linkedin/', BlogShareLinkedInView.as_view(), name='api_blog_share_linkedin'),
    path('categories/', CategoryListView.as_view(), name='api_category_list'),
    path('playlists/', PlaylistListView.as_view(), name='api_playlist_list'),
    path('playlists/<slug:slug>/', PlaylistDetailView.as_view(), name='api_playlist_detail'),
    path('contact/', ContactCreateView.as_view(), name='api_contact_create'),
]
