from django.http import JsonResponse

from .services import SearchService


def search_api(request):
    """JSON endpoint powering the header search dropdown."""
    query = request.GET.get('q', '').strip()
    if not query:
        return JsonResponse({'query': query, 'results': []})

    results = SearchService.search(query, limit=8)
    return JsonResponse({'query': query, 'results': results})
