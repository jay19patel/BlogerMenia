from allauth.socialaccount.providers.oauth2.urls import default_urlpatterns

from .provider import LinkedInOIDCProvider

urlpatterns = default_urlpatterns(LinkedInOIDCProvider)
