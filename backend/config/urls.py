"""URL configuration.

Everything the frontend talks to lives under `/api/v1/`, mounted as a real URL
namespace so DRF's `NamespaceVersioning` can tell versions apart — a `v2` is a
second `include()` here, not a rewrite of every path.

`/accounts/` is allauth's own view tree, kept because the LinkedIn OAuth dance
has to happen against Django. The Next.js app proxies to it.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

v1_patterns = [
    path("", include("core.urls")),
    path("auth/", include("accounts.urls.auth")),
    path("users/", include("accounts.urls.users")),
    path("", include("blog.urls")),
    path("", include("search.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((v1_patterns, "v1"), namespace="v1")),
    # The contract, generated from the serializers themselves — the frontend's
    # types are generated from this rather than hand-maintained.
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
