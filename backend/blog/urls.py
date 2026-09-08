from django.urls import path

from blog.api import (
    BlogDetailView,
    BlogLikeToggleView,
    BlogListView,
    BlogPdfView,
    BlogSaveToggleView,
    BlogShareLinkedInView,
    CategoryListView,
    ContactCreateView,
    PlaylistDetailView,
    PlaylistListView,
)

urlpatterns = [
    path('blogs/', BlogListView.as_view(), name='blog-list'),
    path('blogs/<slug:slug>/', BlogDetailView.as_view(), name='blog-detail'),
    path('blogs/<slug:slug>/like/', BlogLikeToggleView.as_view(), name='blog-like'),
    path('blogs/<slug:slug>/pdf/', BlogPdfView.as_view(), name='blog-pdf'),
    path('blogs/<slug:slug>/save/', BlogSaveToggleView.as_view(), name='blog-save'),
    path('blogs/<slug:slug>/share-linkedin/', BlogShareLinkedInView.as_view(), name='blog-share-linkedin'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('playlists/', PlaylistListView.as_view(), name='playlist-list'),
    path('playlists/<slug:slug>/', PlaylistDetailView.as_view(), name='playlist-detail'),
    path('contact/', ContactCreateView.as_view(), name='contact-create'),
]
