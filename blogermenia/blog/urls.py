from django.urls import path
from .views.home_views import HomeView, ContactView
from .views.blog_views import (
    BlogListView, BlogDetailView, BlogCreateView,
    BlogUpdateView, BlogDeleteView, BlogLikeView, BlogSaveView
)
from .views.playlist_views import (
    PlaylistListView, PlaylistDetailView, PlaylistCreateView,
    PlaylistUpdateView, PlaylistDeleteView,
)
from .views.profile_views import UserProfileView, UserListView, ProfileUpdateView

urlpatterns = [
    # Home
    path('', HomeView.as_view(), name='home'),
    path('contact/', ContactView.as_view(), name='contact'),

    # Blog URLs
    path('blogs/', BlogListView.as_view(), name='blog_list'),
    path('blogs/create/', BlogCreateView.as_view(), name='blog_create'),
    path('blogs/<slug:slug>/', BlogDetailView.as_view(), name='blog_detail'),
    path('blogs/<slug:slug>/update/', BlogUpdateView.as_view(), name='blog_update'),
    path('blogs/<slug:slug>/delete/', BlogDeleteView.as_view(), name='blog_delete'),
    path('blogs/<slug:slug>/like/', BlogLikeView.as_view(), name='blog_like'),
    path('blogs/<slug:slug>/save/', BlogSaveView.as_view(), name='blog_save'),

    # Playlist URLs
    path('playlists/', PlaylistListView.as_view(), name='playlist_list'),
    path('playlists/create/', PlaylistCreateView.as_view(), name='playlist_create'),
    path('playlists/<int:pk>/', PlaylistDetailView.as_view(), name='playlist_detail'),
    path('playlists/<int:pk>/update/', PlaylistUpdateView.as_view(), name='playlist_update'),
    path('playlists/<int:pk>/delete/', PlaylistDeleteView.as_view(), name='playlist_delete'),

    # Profile URLs
    path('accounts-list/', UserListView.as_view(), name='user_list'),
    path('profile/<int:pk>/', UserProfileView.as_view(), name='user_profile'),
    path('profile/<int:pk>/edit/', ProfileUpdateView.as_view(), name='profile_edit'),
]
