"""Semantic search endpoint.

Every call embeds the query through the Gemini API, so this is the one read
endpoint that costs money per request. It is therefore both throttled and
cached — identical queries used to pay for identical embeddings.
"""
import hashlib
import logging

from django.conf import settings
from django.core.cache import cache
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .services import SearchService

logger = logging.getLogger(__name__)

CACHE_TTL = getattr(settings, 'SEARCH_CACHE_TTL', 300)
MIN_QUERY_LENGTH = 2
RESULT_LIMIT = 8


class SearchThrottle(ScopedRateThrottle):
    scope = 'search'


@extend_schema(
    summary="Semantic search",
    parameters=[OpenApiParameter('q', str, description="The search query.")],
    responses={200: None},
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([SearchThrottle])
def search_api(request):
    """Search blogs, playlists and profiles by meaning rather than keyword."""
    query = (request.query_params.get('q') or '').strip()
    if len(query) < MIN_QUERY_LENGTH:
        return Response({'query': query, 'results': []})

    cache_key = 'search:' + hashlib.sha256(query.lower().encode('utf-8')).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return Response({'query': query, 'results': cached})

    try:
        results = SearchService.search(query, limit=RESULT_LIMIT)
    except Exception:
        # Returning 200 with an empty list — which is what this used to do —
        # makes an outage indistinguishable from "no matches", so nobody finds
        # out that search has been broken for a week.
        logger.exception("Search failed for query %r", query)
        return Response(
            {'detail': "Search is temporarily unavailable. Please try again shortly."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    cache.set(cache_key, results, CACHE_TTL)
    return Response({'query': query, 'results': results})
