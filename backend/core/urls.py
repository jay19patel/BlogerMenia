from django.urls import path

from core.api import health

urlpatterns = [
    path("health/", health, name="health"),
]
