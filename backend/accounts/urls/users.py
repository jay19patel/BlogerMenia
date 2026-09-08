from django.urls import path

from accounts.api import (
    SavedBlogsView,
    UserBlogsView,
    UserDetailByUsernameView,
    UserListView,
    UserPlaylistsView,
)

urlpatterns = [
    path('', UserListView.as_view(), name='user-list'),
    # Before the <username> patterns: "me" is not a username.
    path('me/saved-blogs/', SavedBlogsView.as_view(), name='saved-blogs'),
    path('<str:username>/', UserDetailByUsernameView.as_view(), name='user-detail'),
    path('<str:username>/blogs/', UserBlogsView.as_view(), name='user-blogs'),
    path('<str:username>/playlists/', UserPlaylistsView.as_view(), name='user-playlists'),
]
