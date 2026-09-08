from django.conf import settings
from django.db import models
from django.db.models import F

from core.avatars import generate_avatar
from core.slugs import SlugModelMixin
from core.validators import validate_image

CATEGORY_COLORS = {
    'blue': ('text-blue-600', 'bg-blue-50'),
    'rose': ('text-rose-600', 'bg-rose-50'),
    'amber': ('text-amber-600', 'bg-amber-50'),
    'purple': ('text-purple-600', 'bg-purple-50'),
    'teal': ('text-teal-600', 'bg-teal-50'),
    'indigo': ('text-indigo-600', 'bg-indigo-50'),
}


class Category(SlugModelMixin, models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    color = models.CharField(max_length=20, default='blue', choices=[(k, k) for k in CATEGORY_COLORS])

    slug_source = 'name'

    @property
    def text_class(self):
        return CATEGORY_COLORS.get(self.color, CATEGORY_COLORS['blue'])[0]

    @property
    def bg_class(self):
        return CATEGORY_COLORS.get(self.color, CATEGORY_COLORS['blue'])[1]

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']


class Playlist(SlugModelMixin, models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to='playlist_images/', blank=True, null=True, validators=[validate_image]
    )
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='playlists')
    # Unique at the database level: `PlaylistDetailView` looks playlists up by
    # slug, so a duplicate would raise MultipleObjectsReturned on read.
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def avatar_svg(self):
        return generate_avatar(self.slug, style_name="shapes")

    def get_absolute_url(self):
        return f"{settings.FRONTEND_URL}/playlists/{self.slug}"

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']


class EmbeddingStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    INDEXED = 'indexed', 'Indexed'
    FAILED = 'failed', 'Failed'
    SKIPPED = 'skipped', 'Skipped (nothing to index)'


class Blog(SlugModelMixin, models.Model):
    title = models.CharField(max_length=255)
    # Legacy single-body field. Kept for backward compatibility with older posts;
    # structured posts (built by the AI assistant / the Next.js editor) leave it
    # blank and use the structured fields below instead.
    content = models.TextField(blank=True)
    image = models.ImageField(
        upload_to='blog_images/', blank=True, null=True, validators=[validate_image]
    )
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blogs')
    playlists = models.ManyToManyField(Playlist, related_name='blogs', blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='blogs')
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    # Indexed: filtered on almost every query (only published content is shown).
    is_published = models.BooleanField(default=True, db_index=True)
    # Written by `post_to_linkedin_task`, never by a client — the task uses
    # `posted_on_linkedin` as its idempotency key, so a client that could set it
    # would permanently disable sharing for that post.
    posted_on_linkedin = models.BooleanField(default=False)
    linkedin_post_url = models.URLField(max_length=500, blank=True, null=True)
    read_count = models.PositiveIntegerField(default=0)

    # --- Structured content (matches the Next.js BlogEditor / AI assistant schema) ---
    subtitle = models.CharField(max_length=300, blank=True)
    excerpt = models.TextField(blank=True)
    introduction = models.TextField(blank=True)
    conclusion = models.TextField(blank=True)
    # Free-form string tags, e.g. ["Django", "AI"].
    tags = models.JSONField(default=list, blank=True)
    featured = models.BooleanField(default=False, db_index=True)
    # Ordered list of typed section blocks (text/bullets/code/table/youtube/
    # note/links/image/flowchart/excalidraw), as produced by the editor.
    sections = models.JSONField(default=list, blank=True)

    # --- Search index state -------------------------------------------------
    # Without these a failed embedding is indistinguishable from a successful
    # one: the post simply never appears in search and nobody can tell why.
    embedding_status = models.CharField(
        max_length=16, choices=EmbeddingStatus.choices,
        default=EmbeddingStatus.PENDING, db_index=True,
    )
    embedding_error = models.TextField(blank=True)
    embedded_at = models.DateTimeField(null=True, blank=True)
    # Hash of the text last sent to the embedding API. Lets a re-save that did
    # not touch any indexed field skip the (paid) round trip entirely.
    embedding_hash = models.CharField(max_length=64, blank=True)

    # Indexed: the default ordering key for every listing.
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_published', '-created_at'], name='blog_published_recent_idx'),
        ]

    def get_absolute_url(self):
        """The post's public URL — on the Next.js frontend.

        Django serves no blog pages any more, so reversing a Django route here
        (which is what this used to do) raised NoReverseMatch for every caller.
        """
        return f"{settings.FRONTEND_URL}/blogs/{self.slug}"

    def __str__(self):
        return self.title

    def like_count(self):
        return self.likes.count()

    def is_liked_by(self, user):
        if user.is_authenticated:
            return self.likes.filter(user=user).exists()
        return False

    def register_view(self, request):
        """Count a read. Anonymous readers count; only the author's own views
        are skipped (so authors don't inflate their own numbers).

        Uses an F() update so concurrent reads don't clobber each other, and
        .update() (not .save()) so it never re-fires save signals.
        """
        user = request.user
        if not user.is_authenticated or user != self.author:
            type(self).objects.filter(pk=self.pk).update(read_count=F('read_count') + 1)

    @property
    def avatar_svg(self):
        return generate_avatar(self.slug, style_name="shapes")


class Like(models.Model):
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['blog', 'user'], name='unique_blog_user_like'),
        ]

    def __str__(self):
        return f"{self.user.username} likes {self.blog.title}"


class ContactEntry(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Contact Entries"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.subject}"
