from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from blogs.models import Blog, Category
from playlists.models import Playlist
import random
import uuid
import datetime

User = get_user_model()

class Command(BaseCommand):
    help = 'Generates 20 rich dummy blog posts based on user schema'

    def handle(self, *args, **kwargs):
        self.stdout.write('Generating rich dummy blogs...')

        users = list(User.objects.all())
        if not users:
            admin = User.objects.create_superuser('admin_dummy', 'admin@example.com', 'password')
            users = [admin]
            self.stdout.write('Created default admin user for authoring.')

        # Technology-focused categories and topics
        topics = [
            ("Advanced React Patterns", "Technology"),
            ("Mastering Django ORM", "Technology"),
            ("The Guide to Healthy Eating", "Food"),
            ("Solo Travel vs Group Travel", "Travel"),
            ("Introduction to Machine Learning", "AI"),
            ("CSS Grid Uses", "Technology"),
            ("Python for Data Analysis", "Data Science"),
            ("Meditation Techniques", "Health"),
            ("Understanding Cryptocurrency", "Finance"),
            ("Minimalist Home Decor", "Lifestyle"),
            ("Javascript ES6 Features", "Technology"),
            ("Best Hiking Trails in Europe", "Travel"),
            ("French Cooking Basics", "Food"),
            ("Cybersecurity 101", "Technology"),
            ("Yoga for Beginners", "Health"),
            ("Investing for Retirement", "Finance"),
            ("Digital Photography Tips", "Lifestyle"),
            ("Docker and Kubernetes Explained", "Technology"),
            ("The Future of EV Cars", "Technology"),
            ("Writing a Novel", "Lifestyle"),
        ]

        for title_base, category_name in topics:
            run_id = str(uuid.uuid4())[:8]
            title = f"{title_base} {run_id}"
            slug = slugify(title)
            
            author = random.choice(users)
            category_obj, _ = Category.objects.get_or_create(name=category_name)

            # Constructing rich sections
            sections = []
            
            # 1. Text Section
            sections.append({
                "title": "Introduction to concepts",
                "type": "text",
                "content": f"This is a deep dive into {title_base}. We will explore the fundamental principles and extensive applications in the real world."
            })

            # 2. Bullets Section
            sections.append({
                "title": "Key Takeaways",
                "type": "bullets",
                "items": [
                    "Understanding the core basics",
                    "Real-world application scenarios",
                    "Common pitfalls to avoid",
                    "Expert tips for success",
                    "Future trends in this domain"
                ]
            })

            # 3. Code Section (if Tech)
            if category_name in ["Technology", "AI", "Data Science"]:
                sections.append({
                    "title": "Example Implementation",
                    "type": "code",
                    "language": "python",
                    "content": "def main():\n    print('Hello World')\n    data = [1, 2, 3]\n    return sum(data)"
                })

            # 4. Table Section
            sections.append({
                "title": "Comparison Analysis",
                "type": "table",
                "headers": ["Feature", "Option A", "Option B"],
                "rows": [
                    ["Cost", "Low", "High"],
                    ["Speed", "Fast", "Medium"],
                    ["Ease of Use", "Easy", "Complex"]
                ]
            })

            # 5. Note Section
            sections.append({
                "title": "Important Note",
                "type": "note",
                "content": "Remember that consistency is key when learning any new skill. Practice daily for best results."
            })

            blog = Blog.objects.create(
                author=author,
                title=title_base, # Keep clean title for display
                subtitle=f"A comprehensive guide to {title_base} with examples and tips.",
                slug=slug,
                excerpt=f"Discover everything you need to know about {title_base}. A full guide for beginners and experts.",
                introduction=f"{title_base} is a fascinating topic that has gained massive popularity recently. In this guide, we cover everything from basics to advanced techniques.",
                sections=sections,
                conclusion="We hope this guide helped you understand the topic better. Keep exploring and happy learning!",
                category=category_obj,
                isPublished=True,
                publishedDate=datetime.datetime.now()
            )
            
            self.stdout.write(self.style.SUCCESS(f'Created rich blog: {title_base}'))

        self.stdout.write(self.style.SUCCESS('Successfully created 20 rich dummy blogs.'))

        # Generate Dummy Playlists
        self.stdout.write('Generating dummy playlists...')
        
        all_blogs = list(Blog.objects.all())
        if not all_blogs:
             self.stdout.write(self.style.WARNING('No blogs found to create playlists. Skipping.'))
             return

        playlist_titles = [
            "My Favorite Tech Reads",
            "Weekend Travel Plans",
            "Cooking Inspirations",
            "Must Read Before 30",
            "Programming Fundamentals",
            "Data Science Resources",
            "Morning Routine Ideas",
            "Best of 2024",
            "Deep Learning Papers",
            "Productivity Hacks",
            "Web Development Trends",
            "Healthy Life Choices"
        ]

        for i in range(10):
            # Pick a random title
            base_title = random.choice(playlist_titles)
            unique_title = f"{base_title} {run_id}-{i}"
            
            owner = random.choice(users)
            
            playlist = Playlist.objects.create(
                owner=owner,
                name=unique_title,
                description=f"A collection of great articles about {base_title.lower()}.",
                is_public=True
            )
            
            # Add 3-8 random blogs to the playlist
            num_blogs = random.randint(3, 8)
            selected_blogs = random.sample(all_blogs, min(num_blogs, len(all_blogs)))
            playlist.blogs.set(selected_blogs)
            
            self.stdout.write(self.style.SUCCESS(f'Created playlist: {unique_title} with {len(selected_blogs)} blogs'))
            
        self.stdout.write(self.style.SUCCESS('Successfully created 10 dummy playlists.'))
