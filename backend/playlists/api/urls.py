from django.urls import path
from playlists.api.views import (
    PlaylistListCreateView, PlaylistDetailView, MyPlaylistsView, UserPlaylistsView,
    PlaylistBlogActionView, PublicPlaylistListView
)

urlpatterns = [
    path('playlists/', PlaylistListCreateView.as_view(), name='playlist-list-create'),
    path('playlists/public/', PublicPlaylistListView.as_view(), name='public-playlists'),
    path('playlists/my-playlists/', MyPlaylistsView.as_view(), name='my-playlists'),
    
    # Specific User Playlists (e.g. /playlists/user/jay/)
    path('playlists/user/<str:username>/', UserPlaylistsView.as_view(), name='user-playlists'),
    
    # Detail views
    path('playlists/<slug:slug>/', PlaylistDetailView.as_view(), name='playlist-detail'),
    
    # Actions
    path('playlists/<slug:slug>/blogs/', PlaylistBlogActionView.as_view(), name='playlist-add-blog'),
    path('playlists/<slug:slug>/blogs/<int:blog_id>/', PlaylistBlogActionView.as_view(), name='playlist-remove-blog'),
]
