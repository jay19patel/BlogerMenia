from django.views.generic import TemplateView
from blogs.models import FAQ, Testimonial


from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

@method_decorator(cache_page(60 * 15), name='dispatch')
class HomeView(TemplateView):
    template_name = "home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Fetch FAQs from database
        faqs = FAQ.objects.all()
        context['faqs'] = [
            {
                'question': faq.question,
                'answer': faq.answer
            }
            for faq in faqs
        ]

        # Fetch Testimonials from database
        testimonials = Testimonial.objects.select_related('user').all()
        context['testimonials'] = [
            {
                'name': testimonial.user.get_display_name() if hasattr(testimonial.user, 'get_display_name') else testimonial.user.username,
                'message': testimonial.content,
                'profile_image': testimonial.user.get_profile_image_url() if hasattr(testimonial.user, 'get_profile_image_url') else None
            }
            for testimonial in testimonials
        ]
        
        # --- Real Statistics ---
        from django.contrib.auth import get_user_model
        from blogs.models import Blog
        from django.db.models import Sum
        
        User = get_user_model()
        
        # 1. Active Users (Total users)
        context['stats_active_users'] = User.objects.count()
        
        # 2. Blogs Published
        context['stats_blogs_published'] = Blog.objects.filter(isPublished=True).count()
        
        # 3. Total Views (Sum of views of all PROCESSED blogs - or published ones)
        # We'll sum views of published blogs for accuracy
        total_views = Blog.objects.filter(isPublished=True).aggregate(total=Sum('views'))['total'] or 0
        
        # Format total_views for display (e.g., 2.4M) - optional, or just pass number
        # Let's pass the raw number and let template filter handle it, or do simple formatting here
        if total_views >= 1000000:
            context['stats_total_views'] = f"{total_views/1000000:.1f}M"
        elif total_views >= 1000:
            context['stats_total_views'] = f"{total_views/1000:.1f}K"
        else:
            context['stats_total_views'] = str(total_views)

        return context
