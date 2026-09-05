import os
import uuid
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML

from .services import ai_service
from .models import Blog

@shared_task
def generate_blog_pdf(blog_id, base_url="http://127.0.0.1:8000"):
    """
    Generate a PDF from a blog post using WeasyPrint.
    The base_url is needed so WeasyPrint can resolve absolute paths for images/css.
    """
    try:
        blog = Blog.objects.get(id=blog_id)
        
        # Render the isolated template for PDF
        context = {'blog': blog}
        html_string = render_to_string('blog/pdf_template.html', context)
        
        # Ensure pdfs directory exists in MEDIA_ROOT
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'pdfs')
        os.makedirs(pdf_dir, exist_ok=True)
        
        # Generate filename
        pdf_filename = f'blog_{blog.slug}_{uuid.uuid4().hex[:8]}.pdf'
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        # Write PDF
        HTML(string=html_string, base_url=base_url).write_pdf(pdf_path)
        
        return {
            'status': 'success', 
            'filename': pdf_filename, 
            'path': f'pdfs/{pdf_filename}'
        }
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=2,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def generate_blog_metadata(blog_id):
    """Fill in a blog's excerpt/tags via Gemini if they're missing.

    Delegates to `ai_service.ensure_metadata`, which updates via .update()
    (not .save()) so this never re-triggers the post_save signal that
    enqueued it. `ensure_metadata` swallows Gemini errors (so callers like the
    LinkedIn task can fall back gracefully), so we re-check its result here
    and raise if it's still empty — that's what turns a transient Gemini
    outage into an autoretry instead of a silently-never-filled-in excerpt.
    """
    blog = Blog.objects.filter(id=blog_id).first()
    if blog is None:
        return
    ai_service.ensure_metadata(blog)
    if not (blog.excerpt and blog.tags):
        raise RuntimeError(f"Gemini metadata generation failed for blog {blog_id}")
