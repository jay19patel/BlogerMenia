from django.urls import path
from blogs.Views import home, blogs, account, playlists
from blogs import api

urlpatterns = [
    path('', home.HomeView.as_view(), name='home'),

    # Blog URLs
    path('blogs/', blogs.BlogListView.as_view(), name='blogs-list'),
    path('blogs/create/', blogs.BlogCreateView.as_view(), name='blog-create'),
    path('blogs/<str:username>/', blogs.UserBlogListView.as_view(), name='user-blogs'),
    path('blogs/<str:username>/edit/', blogs.UserBlogManageView.as_view(), name='user-blogs-edit'),
    path('blogs/<str:username>/<slug:slug>/', blogs.BlogDetailView.as_view(), name='blog-detail'),
    path('blogs/<str:username>/<slug:slug>/edit/', blogs.BlogUpdateView.as_view(), name='blog-update'),
    path('blogs/<str:username>/<slug:slug>/delete/', blogs.BlogDeleteView.as_view(), name='blog-delete'),
    
    # API URLs
    path('api/blogs/<slug:slug>/like/', api.ToggleBlogLikeAPI.as_view(), name='blog-like-toggle'),

    # Playlist URLs
    path('playlists/create/', playlists.PlaylistCreateView.as_view(), name='playlist-create'),
    path('playlists/<str:username>/<slug:slug>/', playlists.PlaylistDetailView.as_view(), name='playlist-detail'),
    path('playlists/<str:username>/<slug:slug>/edit/', playlists.PlaylistUpdateView.as_view(), name='playlist-update'),
    path('playlists/<str:username>/<slug:slug>/delete/', playlists.PlaylistDeleteView.as_view(), name='playlist-delete'),

    # Profile URLs
    path('profile/', account.ProfileView.as_view(), name='profile'),
]
