from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from blog.models import Blog, Playlist, Category

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed realistic sample data (categories + blogs + playlist). Clears existing blogs/playlists first.'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing blogs and playlists...')
        Blog.objects.all().delete()
        Playlist.objects.all().delete()

        # Categories
        self.stdout.write('Creating categories...')
        tech, _ = Category.objects.get_or_create(name='Technology', defaults={'slug': 'technology', 'color': 'blue'})
        design, _ = Category.objects.get_or_create(name='Design', defaults={'slug': 'design', 'color': 'purple'})
        business, _ = Category.objects.get_or_create(name='Business', defaults={'slug': 'business', 'color': 'amber'})
        Category.objects.get_or_create(name='Lifestyle', defaults={'slug': 'lifestyle', 'color': 'rose'})
        Category.objects.get_or_create(name='Science', defaults={'slug': 'science', 'color': 'teal'})

        # Author — use superuser or create one
        author = User.objects.filter(is_superuser=True).first()
        if not author:
            author = User.objects.create_superuser(
                username='inkwell',
                email='inkwell@example.com',
                password='inkwell123',
                first_name='Inkwell',
                last_name='Team',
            )
            self.stdout.write(f'Created superuser: inkwell / inkwell123')

        author.bio = 'Writer, builder, and curious mind. Sharing ideas on tech, design, and the craft of building software.'
        author.save()

        # Blog 1 — Technology
        blog1 = Blog.objects.create(
            title='The Art of Writing Clean Code: Principles Every Developer Should Know',
            content='''Writing clean code is one of the most underrated skills in software engineering. It's easy to write code that works — any developer can do that. But writing code that others can read, understand, and modify months later? That's the real craft.

## Why Clean Code Matters

Every line of code you write today will be read many more times than it's written. By you, by your colleagues, by developers who haven't even joined the team yet. The cost of poorly written code compounds over time: bugs become harder to find, features take longer to build, and onboarding new developers becomes a nightmare.

Clean code isn't about aesthetics. It's a business decision.

## Name Things for What They Are

The single most impactful thing you can do is give your variables, functions, and classes honest, descriptive names. Not `d` or `data` or `temp`. Names like `userRegistrationDate` or `calculateShippingCost` communicate intent without requiring a comment.

If you find yourself reaching for a comment to explain what a variable means, the variable name is probably wrong. Rename it instead.

## Functions Should Do One Thing

A function that does three things is three functions pretending to be one. When you read a function and it does one thing, names itself after that one thing, and does it at one level of abstraction — that's a clean function.

The SRP (Single Responsibility Principle) applies to functions just as much as classes. If you can't describe what a function does without using the word "and", break it up.

## Keep it Flat

Deep nesting is a signal that your logic is getting complex. Each level of indentation is cognitive overhead. Return early, invert conditions, extract methods — anything to keep the happy path at the outermost level.

Instead of:
if (user != null) {
    if (user.isActive()) {
        if (user.hasPermission("write")) {
            // do the thing
        }
    }
}

Write:
if (!user || !user.isActive() || !user.hasPermission("write")) return;
// do the thing

The second version is easier to read, easier to test, and easier to modify.

## Comments Are a Last Resort

Comments lie. Not intentionally — but code changes, and comments often don't follow. When there's a discrepancy between code and a comment, the comment is usually wrong.

The best comments explain *why*, not *what*. If you're doing something unusual because of a known browser bug or a quirk in a third-party API, say so. But don't write a comment that says "increment i" next to `i++`.

## The Boy Scout Rule

Leave the code a little cleaner than you found it. Not a massive refactor — just small, consistent improvements. Rename a variable while you're in a file. Extract a helper function that you notice is being duplicated. Fix a typo in a comment.

Over time, this habit keeps codebases from rotting. It's the difference between a codebase that improves with age and one that slowly becomes a museum of bad decisions.

## Testing Is Documentation

Well-written tests tell a story about what the code is supposed to do. They're the most accurate documentation you can write because they fail when the code doesn't match them.

Write tests that describe behavior, not implementation. Test the what, not the how.

## Final Thoughts

Clean code is a practice, not a destination. You'll write messy code sometimes, and that's fine — the goal is to keep learning and improving. The developers who write the cleanest code are usually the ones who've written a lot of messy code and learned from it.''',
            author=author,
            category=tech,
            is_published=True,
        )
        self.stdout.write(f'Created blog: {blog1.title}')

        # Blog 2 — Design
        blog2 = Blog.objects.create(
            title='Design Systems at Scale: Building a Component Library That Actually Gets Used',
            content='''Most design system efforts fail quietly. Not with a big announcement — they just stop getting used. Teams adopt it enthusiastically for six months, then drift back to one-off components and inconsistent patterns. Understanding why requires looking at the human side of design systems, not just the technical one.

## The Adoption Problem

A design system is only as valuable as its adoption rate. A perfectly architected library that developers ignore is worthless. The teams that build successful design systems understand this from day one — they're building something people need to choose to use.

The best way to get adoption? Make the design system the path of least resistance.

## Start With Pain Points, Not Idealism

The mistake most teams make is trying to boil the ocean — building a comprehensive, production-ready system before anyone has used it. This creates two problems:

First, you spend months building things nobody needs. Second, by the time it ships, the team has already built their own solutions and has no incentive to migrate.

Start with the three or four components that cause the most inconsistency or rework. Buttons. Form inputs. Modals. These are almost always the most duplicated components in any codebase, and they're usually where the most design drift happens.

## Tokens Are the Foundation

Before you write a single component, define your design tokens. Colors, typography scales, spacing units, border radii, shadow layers. These are the primitives everything else is built from.

A token named `color.brand.500` is more durable than `#10B981`. When the brand color changes next year, you update one value instead of hunting through six thousand lines of CSS.

Tokens also create a shared language between design and engineering. When a designer says "use primary-600 here", everyone knows exactly what that means — and the same value is used in both Figma and the codebase.

## Document With Examples, Not Specifications

Documentation that works is documentation people actually read. Nobody reads a table of props. They look for examples.

For every component, show:
- The default state
- The most common variants
- Edge cases (what happens with very long text? no content at all?)
- What NOT to do

The "don't" examples are often the most valuable — they capture the mistakes people make before the design system existed.

## Versioning and Change Management

The moment your design system is used in production, you have to think about breaking changes. A component update that changes layout behavior might break five apps that depend on it.

Semantic versioning is your friend here. Major versions break things, minor versions add capabilities, patch versions fix bugs. Make this explicit and stick to it.

More importantly: communicate changes. A changelog, a Slack announcement, a migration guide for breaking changes. Teams that feel blindsided by updates stop trusting the system.

## The Governance Question

Who owns the design system? Who can contribute? Who approves changes?

Without answers to these questions, design systems suffer from one of two failure modes: too much control (nothing ever gets added, so teams build around it) or too little (everyone adds components, consistency disappears).

The most successful model I've seen is a small core team that owns the system, with a clear RFC (Request for Comments) process for contributions. Anyone can propose, but proposals go through review before they become part of the system.

## Measuring Success

A design system that's working should be observable. Track adoption rate across products. Measure how often teams need to override system components (a high override rate means the system isn't meeting needs). Collect developer satisfaction scores.

The goal isn't a high component count. The goal is less inconsistency and less duplicated work across the organization.

## The Work Is Never Done

A design system is a product, not a project. It needs ongoing investment, regular updates to stay current with product needs, and someone whose job it is to care about it.

The teams that treat it as a finished artifact — "we built it, now we're done" — always end up with a legacy system nobody uses and everyone resents. The teams that treat it as a living product keep it relevant and adopted.''',
            author=author,
            category=design,
            is_published=True,
        )
        self.stdout.write(f'Created blog: {blog2.title}')

        # Blog 3 — Business
        blog3 = Blog.objects.create(
            title='From Side Project to Startup: What Nobody Tells You About the First Year',
            content='''I spent three years working on side projects before one of them turned into a real business. Looking back, almost everything I believed about building a startup was wrong — not dramatically wrong, just subtly, persistently wrong in ways that cost me time and money.

Here's what I wish someone had told me.

## The Product Isn't the Hard Part

Before I started, I thought the hard part of building a startup was building the product. Engineers believe this because it's the part they know how to do.

The hard part is finding people who have a problem bad enough that they'll pay to solve it, and then getting them to believe your product solves it.

Most early-stage startups don't die because they built the wrong thing. They die because they built the right thing for people who didn't exist or didn't have money.

## Talk to Users Before You Write Code

The advice everyone gives and almost nobody follows: talk to users before you build anything. Not to validate your idea — validation is a myth, you'll find a way to hear what you want to hear — but to understand the shape of their problem.

Ask about their current workflow. What do they use now? Where does it break down? What have they already tried? What would have to be true for them to switch to something new?

You're not pitching. You're learning. The goal is to come away with a problem statement that surprises you.

## Revenue Solves Everything

Early revenue is the best feedback you can get. Not testimonials. Not usage stats. Revenue.

When someone pays you for something, they're telling you that the problem is real and that your solution is good enough. When they don't, they're telling you the opposite, even if they said they loved the demo.

Charge early. Charge more than you're comfortable with. Lower prices attract users who aren't committed to solving the problem.

## Your First Customers Are Wrong

This sounds counterintuitive, but your first customers are often not your best long-term customers. They're early adopters — they're willing to deal with rough edges and missing features that most people wouldn't tolerate.

Build for them while keeping an eye on the customers you want in year two. If your early adopters need deep technical customization and your target market is non-technical SMBs, you might be building the wrong thing.

## Distribution Is a Skill

The best product doesn't always win. The product that most people hear about and try and tell their friends about wins.

Distribution is a skill that most technical founders neglect. They think if they build something great, people will find it. They won't. You have to go find them.

Content marketing, partnerships, cold outreach, community building, paid acquisition — these are all learnable. Pick one channel and get good at it before spreading thin across five.

## Protect Your Energy

Building a company is a marathon. The founders who burn out in year one — and there are many — often do it by treating every week like a sprint.

Sustainable effort over time beats heroic effort for six months. Sleep. Exercise. Take a weekend off occasionally. Your best thinking happens when your brain isn't running on fumes.

## The Year-One Lesson

If I could summarize everything I learned in the first year in one sentence: your instincts about what users want and what they'll pay for are probably wrong, and the only way to fix that is to talk to a lot of people and watch them interact with your product.

Everything else — the tech stack, the pricing model, the team structure — you can figure out as you go. Getting the problem right is the thing you can't catch up on later.''',
            author=author,
            category=business,
            is_published=True,
        )
        self.stdout.write(f'Created blog: {blog3.title}')

        # Playlist
        playlist = Playlist.objects.create(
            title='Essential Reading for Builders',
            description='A curated collection for developers and makers who want to build better.',
            author=author,
        )
        playlist.blogs.set([blog1, blog2, blog3])
        self.stdout.write(f'Created playlist: {playlist.title}')

        self.stdout.write(self.style.SUCCESS('\nSeed complete! Categories, 3 blogs, and 1 playlist created.'))
