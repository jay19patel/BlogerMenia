from django.views.generic import TemplateView
from django.contrib import messages
class HomeView(TemplateView):
    template_name = "home.html"

    testimonials = [
                        {
                            "name": "John Doe",
                            "role": "Developer",
                            "image": "/static/images/user1.jpg",
                            "message": "This platform makes blogging super easy!"
                        },
                        {
                            "name": "Sarah Smith",
                            "role": "Writer",
                            "image": "/static/images/user2.jpg",
                            "message": "AI-generated blogs saved me so much time!"
                        }
                    ]
    faqs = [
                {
                    "question": "How does the AI blog generator work?",
                    "answer": "Our AI uses advanced algorithms to create unique blog content based on your input."
                },
                {
                    "question": "Can I customize the generated blogs?",
                    "answer": "Yes, you can edit and personalize the content as much as you like."
                }
            ]
    extra_context = {"testimonials": testimonials,"faqs":faqs}


    # def get(self, request, *args, **kwargs):
    #     # Example notifications for different types
    #     # You can comment/uncomment these to test different notification types
    #     messages.success(request, "Welcome to BlogerMenia! Your AI-powered blogging platform.")
    #     # messages.error(request, "This is an error message example.")
    #     # messages.warning(request, "This is a warning message example.")
    #     # messages.info(request, "This is an info message example.")
    #     return super().get(request, *args, **kwargs)