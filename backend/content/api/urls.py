from django.urls import path, include
from rest_framework.routers import DefaultRouter
from content.api.views import FAQViewSet, TestimonialViewSet

router = DefaultRouter()
router.register(r'faqs', FAQViewSet)
router.register(r'testimonials', TestimonialViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
