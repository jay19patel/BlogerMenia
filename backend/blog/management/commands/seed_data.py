from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from blog.models import Blog, Playlist, Category, Like, ContactEntry
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed comprehensive technical dummy data with all section types (flowchart, excalidraw, code, table, etc.).'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing dummy data...')
        Like.objects.all().delete()
        Blog.objects.all().delete()
        Playlist.objects.all().delete()
        Category.objects.all().delete()
        ContactEntry.objects.all().delete()

        # ---------------------------------------------------------------- Categories
        self.stdout.write('Creating categories...')
        cat_sys, _ = Category.objects.get_or_create(name='System Architecture', defaults={'slug': 'system-architecture', 'color': 'indigo'})
        cat_backend, _ = Category.objects.get_or_create(name='Backend & Django', defaults={'slug': 'backend-django', 'color': 'blue'})
        cat_ai, _ = Category.objects.get_or_create(name='AI & Machine Learning', defaults={'slug': 'ai-machine-learning', 'color': 'teal'})
        cat_devops, _ = Category.objects.get_or_create(name='DevOps & Cloud', defaults={'slug': 'devops-cloud', 'color': 'purple'})
        cat_frontend, _ = Category.objects.get_or_create(name='Frontend & Design', defaults={'slug': 'frontend-design', 'color': 'rose'})

        # ---------------------------------------------------------------- Authors
        self.stdout.write('Creating users & authors...')
        author, _ = User.objects.get_or_create(
            username='jaypatel',
            defaults={
                'email': 'jay@blogermenia.com',
                'first_name': 'Jay',
                'last_name': 'Patel',
                'is_staff': True,
                'is_superuser': True,
                'bio': 'Principal Architect & Full-Stack Engineer. Passionate about Django, distributed systems, and modern UI/UX.'
            }
        )
        if not author.check_password('admin123'):
            author.set_password('admin123')
            author.save()

        author2, _ = User.objects.get_or_create(
            username='alex_dev',
            defaults={
                'email': 'alex@blogermenia.com',
                'first_name': 'Alex',
                'last_name': 'Rivers',
                'bio': 'Senior DevOps Engineer specialising in Kubernetes, Celery queues, and cloud infrastructure.'
            }
        )

        # ---------------------------------------------------------------- Blog 1: High Performance Async Architecture
        blog1_sections = [
            {
                "type": "text",
                "title": "Introduction to Async Processing in Modern Web Apps",
                "content": "When building production web applications, heavy tasks like PDF generation, email sending, data analysis, and AI model inference should never run inside the HTTP request-response cycle. Blocking the main Gunicorn/Django worker thread for 5 seconds ruins user experience and degrades server throughput."
            },
            {
                "type": "excalidraw",
                "title": "Architecture: Web App, Redis Queue & Worker Pool",
                "elements": [
                    {"id": "box1", "type": "rectangle", "x": 50, "y": 50, "width": 160, "height": 70, "strokeColor": "#4f46e5", "backgroundColor": "#eef2ff", "fillStyle": "hachure", "strokeWidth": 2},
                    {"id": "text1", "type": "text", "x": 65, "y": 75, "text": "Django Web App", "fontSize": 15, "fontFamily": 1},
                    {"id": "arrow1", "type": "arrow", "x": 210, "y": 85, "points": [[0,0], [90,0]], "strokeColor": "#64748b"},
                    {"id": "box2", "type": "rectangle", "x": 300, "y": 50, "width": 160, "height": 70, "strokeColor": "#059669", "backgroundColor": "#ecfdf5", "fillStyle": "hachure", "strokeWidth": 2},
                    {"id": "text2", "type": "text", "x": 325, "y": 75, "text": "Redis Broker", "fontSize": 15, "fontFamily": 1},
                    {"id": "arrow2", "type": "arrow", "x": 460, "y": 85, "points": [[0,0], [90,0]], "strokeColor": "#64748b"},
                    {"id": "box3", "type": "rectangle", "x": 550, "y": 50, "width": 160, "height": 70, "strokeColor": "#d97706", "backgroundColor": "#fffbeb", "fillStyle": "hachure", "strokeWidth": 2},
                    {"id": "text3", "type": "text", "x": 570, "y": 75, "text": "Celery Workers", "fontSize": 15, "fontFamily": 1}
                ],
                "appState": {"viewBackgroundColor": "#ffffff"},
                "svgData": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 760 160\" width=\"100%\" height=\"160\"><style>text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600; fill: #1e293b; }</style><rect x=\"20\" y=\"35\" width=\"180\" height=\"80\" rx=\"12\" fill=\"#eef2ff\" stroke=\"#4f46e5\" stroke-width=\"2\"/><text x=\"50\" y=\"80\" fill=\"#4338ca\">Django Web App</text><path d=\"M 200 75 L 280 75\" stroke=\"#94a3b8\" stroke-width=\"2.5\" marker-end=\"url(#arrow)\"/><rect x=\"290\" y=\"35\" width=\"180\" height=\"80\" rx=\"12\" fill=\"#ecfdf5\" stroke=\"#10b981\" stroke-width=\"2\"/><text x=\"335\" y=\"80\" fill=\"#047857\">Redis Broker</text><path d=\"M 470 75 L 550 75\" stroke=\"#94a3b8\" stroke-width=\"2.5\" marker-end=\"url(#arrow)\"/><rect x=\"560\" y=\"35\" width=\"180\" height=\"80\" rx=\"12\" fill=\"#fffbeb\" stroke=\"#f59e0b\" stroke-width=\"2\"/><text x=\"595\" y=\"80\" fill=\"#b45309\">Celery Workers</text><defs><marker id=\"arrow\" viewBox=\"0 0 10 10\" refX=\"5\" refY=\"5\" markerWidth=\"6\" markerHeight=\"6\" orient=\"auto-start-reverse\"><path d=\"M 0 0 L 10 5 L 0 10 z\" fill=\"#94a3b8\"/></marker></defs></svg>",
                "caption": "Figure 1. Architectural blueprint of Django + Redis + Celery worker system."
            },
            {
                "type": "flowchart",
                "title": "Async Execution Lifecycle",
                "steps": [
                    {"title": "1. User Triggers Action", "description": "User clicks 'Generate PDF Report' on frontend UI."},
                    {"title": "2. Task Dispatch", "description": "Django enqueues task signature to Redis in < 5ms."},
                    {"title": "3. Immediate HTTP Response", "description": "API returns HTTP 202 Accepted with task_id."},
                    {"title": "4. Celery Worker Execution", "description": "Background worker consumes task payload and renders PDF in background."},
                    {"title": "5. Notification / Webhook", "description": "Task status updated in DB or pushed to frontend via WebSocket."}
                ]
            },
            {
                "type": "code",
                "title": "Celery Task Implementation",
                "language": "python",
                "content": "@shared_task(bind=True, max_retries=3, default_retry_delay=60)\ndef generate_pdf_report(self, user_id, report_type):\n    try:\n        logger.info(f\"Generating {report_type} for User #{user_id}\")\n        pdf_binary = render_pdf_document(user_id, report_type)\n        save_to_s3(pdf_binary)\n        return {\"status\": \"success\", \"user_id\": user_id}\n    except StorageError as exc:\n        logger.error(f\"S3 storage error: {exc}\")\n        raise self.retry(exc=exc)"
            },
            {
                "type": "table",
                "title": "Performance Benchmark: Sync vs Async Response Times",
                "headers": ["Execution Mode", "Avg Response Time", "Max Throughput (req/sec)", "Server CPU Utilization"],
                "rows": [
                    ["Synchronous (Blocking)", "3420 ms", "18 req/sec", "98% (High Contention)"],
                    ["Asynchronous (Celery)", "14 ms", "1450 req/sec", "22% (Optimal)"]
                ]
            },
            {
                "type": "note",
                "title": "Production Deployment Safety",
                "content": "Always configure a separate Celery task queue for time-critical jobs (e.g. transactional emails) versus heavy background batch jobs (e.g. data exports) so long jobs never starve rapid tasks."
            },
            {
                "type": "bullets",
                "title": "Best Practices for Async Architecture",
                "items": [
                    "Make all tasks idempotent: Re-running a task with the same arguments should produce identical results without duplicating side-effects.",
                    "Set task timeouts: Use time_limit and soft_time_limit to kill stuck processes.",
                    "Use Flower for monitoring: Monitor Celery worker thread health and queue depth in real time.",
                    "Pass IDs instead of large objects: Pass user_id or blog_id to tasks rather than entire JSON data dumps."
                ]
            },
            {
                "type": "youtube",
                "title": "Deep Dive: Scaling Django Async Architecture",
                "videoId": "F5mRW0jo-U4",
                "videoTitle": "Building Resilient Python Systems",
                "description": "Watch this 15-minute engineering breakdown on managing background task queues."
            },
            {
                "type": "links",
                "title": "Official Resources & Documentation",
                "links": [
                    {"text": "Celery Official Documentation", "url": "https://docs.celeryq.dev", "description": "Distributed task queue guide"},
                    {"text": "Redis Documentation", "url": "https://redis.io/docs", "description": "In-memory data store & message broker"},
                    {"text": "Django Task Queues Best Practices", "url": "https://docs.djangoproject.com", "description": "Official Django architectural reference"}
                ]
            }
        ]

        blog1 = Blog.objects.create(
            title='Building High-Throughput Async Architecture with Django, Celery & Redis',
            subtitle='Learn how to offload heavy workloads, reduce HTTP latency from 3s to 14ms, and build fault-tolerant task pipelines.',
            excerpt='A complete guide to designing async task processing in Django using Celery, Redis, Excalidraw architecture blueprints, and real-time benchmarks.',
            introduction='In modern software development, user experience is directly tied to latency. If an API request takes longer than 200ms, users perceive lag. In this article, we dive into building an enterprise-grade async processing pipeline.',
            conclusion='By offloading CPU and I/O intensive tasks to dedicated Celery workers, your Django application remains lightweight, fast, and capable of handling thousands of requests per second.',
            author=author,
            category=cat_sys,
            is_published=True,
            featured=True,
            read_count=1420,
            tags=['Django', 'Architecture', 'Celery', 'Redis', 'Performance'],
            sections=blog1_sections
        )
        self.stdout.write(f'Created blog: {blog1.title}')

        # ---------------------------------------------------------------- Blog 2: Advanced PostgreSQL Indexing & Django ORM
        blog2_sections = [
            {
                "type": "text",
                "title": "Understanding Query Execution in PostgreSQL",
                "content": "As database tables grow beyond millions of rows, unindexed queries transform fast web apps into sluggish bottlenecks. Understanding how PostgreSQL query planner works and leveraging B-Tree, GIN, and Partial Indexes is essential for senior backend developers."
            },
            {
                "type": "excalidraw",
                "title": "PostgreSQL B-Tree Index Traversal vs Sequential Scan",
                "elements": [
                    {"id": "node1", "type": "rectangle", "x": 50, "y": 50, "width": 160, "height": 70, "strokeColor": "#2563eb", "backgroundColor": "#dbeafe", "fillStyle": "hachure", "strokeWidth": 2},
                    {"id": "text1", "type": "text", "x": 75, "y": 75, "text": "Root Node (id)", "fontSize": 15, "fontFamily": 1},
                    {"id": "arrow1", "type": "arrow", "x": 210, "y": 85, "points": [[0,0], [90,0]], "strokeColor": "#64748b"},
                    {"id": "node2", "type": "rectangle", "x": 300, "y": 50, "width": 160, "height": 70, "strokeColor": "#059669", "backgroundColor": "#ecfdf5", "fillStyle": "hachure", "strokeWidth": 2},
                    {"id": "text2", "type": "text", "x": 320, "y": 75, "text": "B-Tree Leaf Block", "fontSize": 15, "fontFamily": 1},
                    {"id": "arrow2", "type": "arrow", "x": 460, "y": 85, "points": [[0,0], [90,0]], "strokeColor": "#64748b"},
                    {"id": "node3", "type": "rectangle", "x": 550, "y": 50, "width": 160, "height": 70, "strokeColor": "#7c3aed", "backgroundColor": "#f3e8ff", "fillStyle": "hachure", "strokeWidth": 2},
                    {"id": "text3", "type": "text", "x": 570, "y": 75, "text": "Target Heap Tuple", "fontSize": 15, "fontFamily": 1}
                ],
                "appState": {"viewBackgroundColor": "#ffffff"},
                "svgData": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 760 160\" width=\"100%\" height=\"160\"><style>text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600; fill: #1e293b; }</style><rect x=\"20\" y=\"35\" width=\"180\" height=\"80\" rx=\"12\" fill=\"#dbeafe\" stroke=\"#2563eb\" stroke-width=\"2\"/><text x=\"55\" y=\"80\" fill=\"#1d4ed8\">Root Node (id)</text><path d=\"M 200 75 L 280 75\" stroke=\"#94a3b8\" stroke-width=\"2.5\" marker-end=\"url(#arrow2)\"/><rect x=\"290\" y=\"35\" width=\"180\" height=\"80\" rx=\"12\" fill=\"#ecfdf5\" stroke=\"#10b981\" stroke-width=\"2\"/><text x=\"320\" y=\"80\" fill=\"#047857\">B-Tree Leaf Block</text><path d=\"M 470 75 L 550 75\" stroke=\"#94a3b8\" stroke-width=\"2.5\" marker-end=\"url(#arrow2)\"/><rect x=\"560\" y=\"35\" width=\"180\" height=\"80\" rx=\"12\" fill=\"#f3e8ff\" stroke=\"#7c3aed\" stroke-width=\"2\"/><text x=\"585\" y=\"80\" fill=\"#6d28d9\">Target Heap Tuple</text><defs><marker id=\"arrow2\" viewBox=\"0 0 10 10\" refX=\"5\" refY=\"5\" markerWidth=\"6\" markerHeight=\"6\" orient=\"auto-start-reverse\"><path d=\"M 0 0 L 10 5 L 0 10 z\" fill=\"#94a3b8\"/></marker></defs></svg>",
                "caption": "Figure 1. PostgreSQL B-Tree Index traversal path reaching target disk tuple in O(log N) time complexity."
            },
            {
                "type": "code",
                "title": "Optimizing Django QuerySets with select_related & Indexing",
                "language": "python",
                "content": "# BAD: Triggers N+1 queries\nblogs = Blog.objects.filter(is_published=True)\nfor b in blogs:\n    print(b.author.username, b.category.name)\n\n# GOOD: Single JOIN query with indexed filtering\nblogs = Blog.objects.filter(is_published=True).select_related('author', 'category')"
            },
            {
                "type": "flowchart",
                "title": "Database Query Optimization Strategy",
                "steps": [
                    {"title": "1. Analyze Execution Plan", "description": "Run EXPLAIN ANALYZE on slow queries to locate Sequential Scans."},
                    {"title": "2. Add Targeted Indexes", "description": "Create composite or partial B-Tree indexes for frequently filtered columns."},
                    {"title": "3. ORM Query Optimization", "description": "Use select_related for foreign keys and prefetch_related for M2M relations."},
                    {"title": "4. Verify Index Usage", "description": "Confirm query planner executes Index Scan instead of Seq Scan."}
                ]
            },
            {
                "type": "table",
                "title": "Database Index Type Comparison",
                "headers": ["Index Type", "Best Use Case", "Lookup Speed (1M Rows)", "Storage Overhead"],
                "rows": [
                    ["B-Tree (Default)", "Exact matches (=) and range queries (<, >)", "1.5 ms", "Low (~15 MB)"],
                    ["GIN (Generalized Inverted)", "Full-text search & JSONField arrays", "4.2 ms", "Medium (~45 MB)"],
                    ["BRIN (Block Range)", "Large sequential time-series tables", "8.0 ms", "Ultra Low (~1 MB)"]
                ]
            },
            {
                "type": "note",
                "title": "Django Indexing Tip",
                "content": "Use db_index=True in model fields or define Meta.indexes with models.Index(fields=['created_at', 'is_published']) for compound filtering."
            },
            {
                "type": "bullets",
                "title": "Key Database Tuning Guidelines",
                "items": [
                    "Always run EXPLAIN ANALYZE before and after creating indexes.",
                    "Avoid over-indexing: Every index slows down INSERT and UPDATE operations.",
                    "Use Partial Indexes for queries that filter on constant booleans (e.g. WHERE is_published = true)."
                ]
            },
            {
                "type": "youtube",
                "title": "PostgreSQL Query Optimization Masterclass",
                "videoId": "F5mRW0jo-U4",
                "videoTitle": "Understanding Postgres Query Execution",
                "description": "Learn how database engines build query execution trees."
            },
            {
                "type": "links",
                "title": "Recommended Postgres Documentation",
                "links": [
                    {"text": "PostgreSQL Index Types Guide", "url": "https://www.postgresql.org/docs/current/indexes-types.html", "description": "Official Postgres documentation"},
                    {"text": "Django Database Optimization", "url": "https://docs.djangoproject.com/en/5.0/topics/db/optimization/", "description": "Django ORM query performance tips"}
                ]
            }
        ]

        blog2 = Blog.objects.create(
            title='Mastering Django ORM & PostgreSQL Indexing for Sub-Millisecond Queries',
            subtitle='Stop N+1 queries, master EXPLAIN ANALYZE, and leverage B-Tree and GIN indexes in Django models.',
            excerpt='A practical guide on optimizing Django ORM queries with PostgreSQL indexing strategies, benchmarks, and query profiling tools.',
            introduction='Database performance is often the line between a smooth application and a crashing server. Let us explore how PostgreSQL query planners operate under heavy read loads.',
            conclusion='With proper indexing strategies and Django ORM optimization techniques, you can easily maintain sub-millisecond database query performance at scale.',
            author=author,
            category=cat_backend,
            is_published=True,
            featured=True,
            read_count=980,
            tags=['Django', 'PostgreSQL', 'ORM', 'Database', 'SQL'],
            sections=blog2_sections
        )
        self.stdout.write(f'Created blog: {blog2.title}')

        # ---------------------------------------------------------------- Blog 3: Design Systems & Tailwind CSS
        blog3_sections = [
            {
                "type": "text",
                "title": "The Evolution of Modern Web Interfaces",
                "content": "Designing high-end interfaces requires more than picking pleasant colors. It demands strict typography scales, purposeful whitespace, subtle visual weight, and micro-interactions that feel responsive and tactile."
            },
            {
                "type": "bullets",
                "title": "Core Principles of Modern Editorial Design",
                "items": [
                    "High-Contrast Typography: Pair editorial serif display fonts (Newsreader) with clean sans-serif UI fonts (Plus Jakarta Sans).",
                    "Hairline Dividers: Replace heavy borders and harsh drop-shadows with subtle 1px hairline dividers.",
                    "Deliberate Whitespace: Give elements room to breathe to enhance scannability and reading comfort.",
                    "Tactile Micro-Interactions: Add smooth 200ms scale & color transitions on interactive hover states."
                ]
            },
            {
                "type": "image",
                "title": "Modern Component Design System",
                "imageUrl": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
                "description": "Design system color tokens, typography scales, and tactile UI components."
            }
        ]

        blog3 = Blog.objects.create(
            title='Crafting Bespoke UI/UX: Design Systems, Micro-Interactions & Typography',
            subtitle='How to strip away cliché AI-generated designs and build human-crafted, premium editorial web interfaces.',
            excerpt='Learn the secrets behind modern editorial web design, typography pairing, whitespace mastery, and Tailwind CSS design tokens.',
            introduction='A great user interface feels invisible—it guides readers effortlessly through content without visual clutter.',
            conclusion='Applying cohesive design tokens and subtle micro-interactions transforms standard web apps into memorable digital publications.',
            author=author2,
            category=cat_frontend,
            is_published=True,
            featured=False,
            read_count=650,
            tags=['Design', 'TailwindCSS', 'UI/UX', 'Frontend', 'Typography'],
            sections=blog3_sections
        )
        self.stdout.write(f'Created blog: {blog3.title}')

        # ---------------------------------------------------------------- Playlists
        self.stdout.write('Creating playlists...')
        p1 = Playlist.objects.create(
            title='Full-Stack Systems Architecture',
            description='A curated roadmap for building high-performance, async Django applications with clean design systems.',
            author=author,
        )
        p1.blogs.set([blog1, blog2, blog3])

        p2 = Playlist.objects.create(
            title='Django Performance & Database Mastery',
            description='Essential reading for backend developers looking to optimize query latency and database indexing.',
            author=author,
        )
        p2.blogs.set([blog1, blog2])

        # ---------------------------------------------------------------- Likes & Views
        self.stdout.write('Adding sample likes & contact entries...')
        Like.objects.create(blog=blog1, user=author)
        Like.objects.create(blog=blog1, user=author2)
        Like.objects.create(blog=blog2, user=author)

        ContactEntry.objects.create(
            name='Sarah Connor',
            email='sarah@techcorp.com',
            subject='Collaboration on Django Architecture Series',
            message='Hi Jay, I loved your post on Celery & Redis async architecture! Would love to invite you for a tech podcast episode.'
        )

        self.stdout.write(self.style.SUCCESS('\nSuccessfully seeded technical dummy data! Categories, structured blogs (with Excalidraw, flowcharts, code, tables), playlists, and users created.'))
