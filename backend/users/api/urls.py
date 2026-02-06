from django.urls import path
from users.api.views import UserProfileView, UserDetailByIdView, TopAuthorsView

urlpatterns = [
    path('profile/<str:username>/', UserProfileView.as_view(), name='user-profile'),
    path('top-authors/', TopAuthorsView.as_view(), name='top-authors'),
    path('<int:pk>/', UserDetailByIdView.as_view(), name='user-detail-by-id'),
]
