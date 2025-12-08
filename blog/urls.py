from django.urls import path
from .views import HomeView, ProfileView, remove_profile_image

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/remove-image/', remove_profile_image, name='remove_profile_image'),
]
