from django.urls import path
from .views.home_views import HomeView
from .views.blog_views import BlogListView, BlogDetailView, BlogCreateView, BlogUpdateView, BlogDeleteView
from .views.playlist_views import PlaylistListView, PlaylistDetailView, PlaylistCreateView, PlaylistUpdateView, PlaylistDeleteView
from .views.profile_views import UserProfileView, UserListView

urlpatterns = [
    # Home
    path('', HomeView.as_view(), name='home'),

    # Blog URLs
    path('blogs/', BlogListView.as_view(), name='blog_list'),
    path('blogs/create/', BlogCreateView.as_view(), name='blog_create'),
    path('blogs/<int:pk>/', BlogDetailView.as_view(), name='blog_detail'),
    path('blogs/<int:pk>/update/', BlogUpdateView.as_view(), name='blog_update'),
    path('blogs/<int:pk>/delete/', BlogDeleteView.as_view(), name='blog_delete'),

    # Playlist URLs
    path('playlists/', PlaylistListView.as_view(), name='playlist_list'),
    path('playlists/create/', PlaylistCreateView.as_view(), name='playlist_create'),
    path('playlists/<int:pk>/', PlaylistDetailView.as_view(), name='playlist_detail'),
    path('playlists/<int:pk>/update/', PlaylistUpdateView.as_view(), name='playlist_update'),
    path('playlists/<int:pk>/delete/', PlaylistDeleteView.as_view(), name='playlist_delete'),

    # Profile URL
    path('accounts-list/', UserListView.as_view(), name='user_list'),
    path('profile/<int:pk>/', UserProfileView.as_view(), name='user_profile'),
]
