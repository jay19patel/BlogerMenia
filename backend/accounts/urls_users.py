from django.urls import path
from .api.users import (
    UserListView, UserDetailByUsernameView, 
    UserBlogsView, UserPlaylistsView, SavedBlogsView
)

urlpatterns = [
    path('', UserListView.as_view(), name='user_list'),
    path('me/saved-blogs/', SavedBlogsView.as_view(), name='saved_blogs'),
    path('<str:username>/', UserDetailByUsernameView.as_view(), name='user_detail'),
    path('<str:username>/blogs/', UserBlogsView.as_view(), name='user_blogs'),
    path('<str:username>/playlists/', UserPlaylistsView.as_view(), name='user_playlists'),
]
