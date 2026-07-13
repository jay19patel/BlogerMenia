import os
from django.conf import settings
from django.http import JsonResponse, FileResponse, Http404
from django.views import View
from celery.result import AsyncResult
from blog.models import Blog
from blog.tasks import generate_blog_pdf

class GeneratePDFView(View):
    """Triggers the Celery task to generate a PDF for the blog and returns task_id."""
    def post(self, request, slug):
        try:
            blog = Blog.objects.get(slug=slug)
            # Pass absolute URI as base_url for images
            base_url = request.build_absolute_uri('/')[:-1]
            task = generate_blog_pdf.delay(blog.id, base_url=base_url)
            return JsonResponse({'status': 'processing', 'task_id': task.id})
        except Blog.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Blog not found'}, status=404)

class CheckPDFStatusView(View):
    """Checks the status of the Celery task."""
    def get(self, request, task_id):
        res = AsyncResult(task_id)
        if res.ready():
            result = res.result
            if isinstance(result, dict) and result.get('status') == 'success':
                return JsonResponse({'status': 'SUCCESS', 'result': result})
            return JsonResponse({'status': 'FAILURE', 'message': 'Task failed or returned error'})
        
        return JsonResponse({'status': 'PENDING'})

class DownloadPDFView(View):
    """Serves the generated PDF file."""
    def get(self, request, task_id):
        res = AsyncResult(task_id)
        if not res.ready():
            raise Http404("PDF not ready")
        
        result = res.result
        if not isinstance(result, dict) or result.get('status') != 'success':
            raise Http404("PDF generation failed")
            
        filename = result.get('filename')
        file_path = os.path.join(settings.MEDIA_ROOT, 'pdfs', filename)
        
        if not os.path.exists(file_path):
            raise Http404("PDF file not found on server")
            
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
