from django.urls import path
from users.api.views import UserProfileView

urlpatterns = [
    path('profile/<str:username>/', UserProfileView.as_view(), name='user-profile'),
]
