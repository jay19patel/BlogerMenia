from django.urls import path, include
from rest_framework.routers import DefaultRouter
from content.api.views import FAQViewSet, TestimonialViewSet, ContactMessageCreateView

router = DefaultRouter()
router.register(r'faqs', FAQViewSet)
router.register(r'testimonials', TestimonialViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('contact/', ContactMessageCreateView.as_view(), name='contact-create'),
]
