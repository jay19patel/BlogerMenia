from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .services import SearchService


@require_GET
def search_api(request):
    """JSON endpoint powering the header search dropdown."""
    query = request.GET.get('q', '').strip()
    if not query:
        return JsonResponse({'query': query, 'results': []})

    results = SearchService.search(query, limit=8)
    return JsonResponse({'query': query, 'results': results})
