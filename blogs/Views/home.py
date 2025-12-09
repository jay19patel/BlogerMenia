from django.views.generic import TemplateView
from blogs.models import FAQ, Testimonial


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

        return context
