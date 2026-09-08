from django.urls import path

from accounts.api import (
    EmailTokenObtainPairView,
    RegisterView,
    SocialHandoffExchangeView,
    TokenRefreshThrottledView,
    UserProfileView,
)

urlpatterns = [
    path('login/', EmailTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('login/refresh/', TokenRefreshThrottledView.as_view(), name='token-refresh'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('me/', UserProfileView.as_view(), name='current-user'),
    path(
        'social/exchange/',
        SocialHandoffExchangeView.as_view(),
        name='social-handoff-exchange',
    ),
]
