import os
import uuid
from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML

from . import ai_service
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

    Uses .update() (not .save()) so this never re-triggers the post_save
    signal that enqueued it.
    """
    blog = Blog.objects.filter(id=blog_id).first()
    if blog is None or (blog.excerpt and blog.tags):
        return

    metadata = ai_service.generate_metadata(blog)
    if metadata is None:
        return

    Blog.objects.filter(id=blog_id).update(
        excerpt=blog.excerpt or metadata['excerpt'],
        tags=blog.tags or metadata['tags'],
    )
