from django.urls import path
from .views.home_views import HomeView, ContactView
from .views.blog_views import (
    BlogListView, BlogDetailView, BlogCreateView,
    BlogUpdateView, BlogDeleteView, BlogLikeView, BlogSaveView,
    BlogShareLinkedInView
)
from .views.playlist_views import (
    PlaylistListView, PlaylistDetailView, PlaylistCreateView,
    PlaylistUpdateView, PlaylistDeleteView,
)
from .views.profile_views import UserProfileView, UserListView, ProfileUpdateView
from .views.pdf_views import GeneratePDFView, CheckPDFStatusView, DownloadPDFView

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
    path('blogs/<slug:slug>/share-linkedin/', BlogShareLinkedInView.as_view(), name='blog_share_linkedin'),
    
    # PDF URLs
    path('blogs/<slug:slug>/pdf-generate/', GeneratePDFView.as_view(), name='blog_pdf_generate'),
    path('blogs/pdf-status/<str:task_id>/', CheckPDFStatusView.as_view(), name='blog_pdf_status'),
    path('blogs/pdf-download/<str:task_id>/', DownloadPDFView.as_view(), name='blog_pdf_download'),

    # Playlist URLs
    path('playlists/', PlaylistListView.as_view(), name='playlist_list'),
    path('playlists/create/', PlaylistCreateView.as_view(), name='playlist_create'),
    path('playlists/<slug:slug>/', PlaylistDetailView.as_view(), name='playlist_detail'),
    path('playlists/<slug:slug>/update/', PlaylistUpdateView.as_view(), name='playlist_update'),
    path('playlists/<slug:slug>/delete/', PlaylistDeleteView.as_view(), name='playlist_delete'),

    # Profile URLs
    path('accounts-list/', UserListView.as_view(), name='user_list'),
    path('profile/<str:username>/', UserProfileView.as_view(), name='user_profile'),
    path('profile/<str:username>/edit/', ProfileUpdateView.as_view(), name='profile_edit'),
]
