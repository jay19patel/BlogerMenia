from django.urls import path, include

urlpatterns = [
    path('', include('blogs.api.urls')),
]
