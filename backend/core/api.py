"""Operational endpoints: health check and readiness.

A load balancer needs something cheap to probe, and an on-call engineer needs a
single URL that says which dependency is down. Both live here rather than in a
feature app because neither belongs to one.
"""
import logging

from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _check(name, fn):
    try:
        fn()
        return name, {"ok": True}
    except Exception as exc:  # noqa: BLE001 — a health check reports, never raises
        logger.warning("Health check %s failed: %s", name, exc)
        return name, {"ok": False, "error": str(exc)[:200]}


def _database():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()


def _cache():
    cache.set("healthcheck", "ok", 10)
    if cache.get("healthcheck") != "ok":
        raise RuntimeError("cache did not return what was written")


def _vector_store():
    from search.services import SearchService

    SearchService.store()


@extend_schema(
    summary="Health check",
    description=(
        "Reports the reachability of each backing service. `?deep=1` also opens "
        "the vector store, which is slower and takes a file lock under Milvus Lite."
    ),
    responses={200: None, 503: None},
)
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def health(request):
    checks = dict([_check("database", _database), _check("cache", _cache)])

    if request.query_params.get("deep") in ("1", "true", "yes"):
        checks.update([_check("vector_store", _vector_store)])

    healthy = all(check["ok"] for check in checks.values())
    return Response(
        {"status": "ok" if healthy else "degraded", "checks": checks},
        status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
