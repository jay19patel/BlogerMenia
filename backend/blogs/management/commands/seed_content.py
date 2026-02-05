from django.core.management.base import BaseCommand
from blogs.models import FAQ, Testimonial, User

class Command(BaseCommand):
    help = 'Seed database with dummy FAQs and Testimonials'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # FAQs
        faq_data = [
            {
                "question": "What is Bloggermenia?",
                "answer": "Bloggermenia is a premier platform for developers and tech enthusiasts to share knowledge, write blogs, and connect with a community of like-minded individuals."
            },
            {
                "question": "Is it free to publish blogs?",
                "answer": "Yes! Publishing blogs on Bloggermenia is completely free. We believe in democratizing knowledge sharing."
            },
            {
                "question": "Can I import my blogs from Medium or Dev.to?",
                "answer": "Currently, we support manual importing. We are working on automated import tools to make migration seamless. Stay tuned!"
            },
            {
                "question": "How do I create a playlist?",
                "answer": "Simply navigate to your profile, click on the 'Create Playlist' card, give it a name, and start adding your favorite blogs to it."
            }
        ]

        for item in faq_data:
            FAQ.objects.get_or_create(question=item['question'], defaults={'answer': item['answer']})
        
        self.stdout.write(f'Seeded {len(faq_data)} FAQs')

        # Testimonials
        # Ensure we have at least one user to link to
        user = User.objects.first()
        if not user:
             self.stdout.write(self.style.WARNING('No users found. Creating a dummy user for testimonials.'))
             user = User.objects.create_user(username='demo_user', password='password123', email='demo@example.com')

        testimonial_data = [
            "Bloggermenia has transformed how I document my learning journey. The markdown support is top-notch!",
            "I love the clean, distraction-free reading experience. It's the best place to read tech articles.",
            "The community here is amazing. I've received great feedback on my articles within hours of posting.",
            "Finally, a blogging platform that actually cares about developer experience. The code blocks look fantastic."
        ]

        for content in testimonial_data:
            Testimonial.objects.get_or_create(content=content, defaults={'user': user})

        self.stdout.write(f'Seeded {len(testimonial_data)} Testimonials')
        self.stdout.write(self.style.SUCCESS('Successfully seeded dummy content'))
