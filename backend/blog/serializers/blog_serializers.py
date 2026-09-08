from django.db import transaction
from rest_framework import serializers

from accounts.serializers import AuthorSerializer
from core.fields import BooleanField, JSONListField
from core.sanitize import clean_html, clean_svg, clean_text
from blog.models import Blog, Category, ContactEntry, Playlist


class CategorySerializer(serializers.ModelSerializer):
    text_class = serializers.CharField(read_only=True)
    bg_class = serializers.CharField(read_only=True)
    # Supplied by an annotation on the queryset; the fallback keeps the
    # serializer usable on a bare instance (admin, tests) without silently
    # issuing a COUNT per row on list endpoints.
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'color', 'text_class', 'bg_class', 'blog_count')
        read_only_fields = ('id', 'slug', 'text_class', 'bg_class')

    def get_blog_count(self, obj) -> int:
        annotated = getattr(obj, 'blog_count_annotated', None)
        return annotated if annotated is not None else obj.blogs.count()


class PlaylistSummarySerializer(serializers.ModelSerializer):
    """A playlist without its posts — what a blog embeds, and what the list
    endpoint returns. Deliberately has no `blogs` field, which is also what
    keeps blog ↔ playlist nesting from recursing."""

    author = AuthorSerializer(read_only=True)
    avatar_svg = serializers.CharField(read_only=True)
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = (
            'id', 'title', 'description', 'image', 'author', 'slug',
            'created_at', 'updated_at', 'avatar_svg', 'blog_count',
        )
        read_only_fields = ('id', 'slug', 'author', 'created_at', 'updated_at', 'avatar_svg')

    def get_blog_count(self, obj) -> int:
        annotated = getattr(obj, 'blog_count_annotated', None)
        return annotated if annotated is not None else obj.blogs.count()

    def validate_description(self, value):
        return clean_text(value)


class BlogSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    playlists = PlaylistSummarySerializer(many=True, read_only=True)

    # --- write-side -------------------------------------------------------
    # `sections` and `tags` are JSONField columns. Sent over multipart they
    # arrive as a single JSON *string*, which DRF's JSONField stores verbatim —
    # so the column ends up holding a str where every reader expects a list.
    # JSONListField decodes first.
    sections = JSONListField(child=serializers.DictField(), required=False)
    tags = JSONListField(child=serializers.CharField(max_length=50), required=False)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category',
        write_only=True, required=False, allow_null=True,
    )
    # The editor's category input is free text with a datalist of existing
    # names, so a name that doesn't exist yet creates the category.
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    playlist_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Playlist.objects.all(), source='playlists',
        write_only=True, required=False,
    )
    # An *intent*, not stored state: "share this to LinkedIn when it saves".
    # The stored `posted_on_linkedin` flag is owned by the task that does it.
    post_to_linkedin = BooleanField(write_only=True, required=False, default=False)
    # Explicit so that a multipart create which omits them takes the model
    # default rather than DRF's unchecked-checkbox `False`.
    is_published = BooleanField(required=False)
    featured = BooleanField(required=False)

    # --- read-side --------------------------------------------------------
    avatar_svg = serializers.CharField(read_only=True)
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = (
            'id', 'title', 'content', 'image', 'author', 'playlists', 'playlist_ids',
            'category', 'category_id', 'category_name', 'slug', 'is_published',
            'posted_on_linkedin', 'linkedin_post_url', 'post_to_linkedin', 'read_count',
            'subtitle', 'excerpt', 'introduction', 'conclusion', 'tags', 'featured',
            'sections', 'created_at', 'updated_at', 'like_count', 'is_liked',
            'avatar_svg', 'embedding_status',
        )
        read_only_fields = (
            'id', 'slug', 'created_at', 'updated_at', 'read_count', 'like_count',
            'is_liked', 'avatar_svg', 'author', 'embedding_status',
            # Written only by post_to_linkedin_task, which uses the flag as its
            # idempotency key — a client that could set it would permanently
            # suppress sharing for that post.
            'posted_on_linkedin', 'linkedin_post_url',
        )

    # ------------------------------------------------------------------ read

    def get_like_count(self, obj) -> int:
        annotated = getattr(obj, 'like_count_annotated', None)
        return annotated if annotated is not None else obj.likes.count()

    def get_is_liked(self, obj) -> bool:
        annotated = getattr(obj, 'is_liked_annotated', None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_liked_by(request.user)
        return False

    # ----------------------------------------------------------------- write

    def validate_content(self, value):
        """Legacy rich-text body — author-supplied HTML rendered verbatim."""
        return clean_html(value)

    def validate_title(self, value):
        return clean_text(value)

    def validate_sections(self, value):
        """Sanitise anything in a section that reaches the DOM as markup.

        `svgData` is an Excalidraw export injected with dangerouslySetInnerHTML
        on the frontend; SVG carries script (`onload`, `<foreignObject>`), so it
        is sanitised on the way in as well as on the way out.
        """
        cleaned = []
        for section in value:
            section = dict(section)
            if section.get('svgData'):
                section['svgData'] = clean_svg(section['svgData'])
            if section.get('content') and section.get('type') not in ('code',):
                section['content'] = clean_text(section['content'])
            cleaned.append(section)
        return cleaned

    def validate(self, attrs):
        name = attrs.pop('category_name', None)
        if name and name.strip() and 'category' not in attrs:
            attrs['category'] = self._category_for(name.strip())
        return attrs

    @staticmethod
    def _category_for(name: str) -> Category:
        existing = Category.objects.filter(name__iexact=name).first()
        if existing:
            return existing
        return Category.objects.create(name=name)

    def create(self, validated_data):
        share = validated_data.pop('post_to_linkedin', False)
        blog = super().create(validated_data)
        self._maybe_share(blog, share)
        return blog

    def update(self, instance, validated_data):
        share = validated_data.pop('post_to_linkedin', False)
        blog = super().update(instance, validated_data)
        self._maybe_share(blog, share)
        return blog

    def _maybe_share(self, blog, share: bool) -> None:
        """Dispatch the LinkedIn share the author asked for.

        Scheduled on commit so the worker never races the transaction, and
        guarded so a broker outage doesn't turn a successful save into a 500.
        """
        if not (share and blog.is_published and not blog.posted_on_linkedin):
            return

        from accounts.tasks import queue_linkedin_post

        transaction.on_commit(lambda: queue_linkedin_post(blog.author_id, blog.pk))


class PlaylistSerializer(PlaylistSummarySerializer):
    """Playlist detail — the posts really are serialised, unlike the previous
    implementation which returned an empty list unconditionally."""

    blogs = serializers.SerializerMethodField()
    blog_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Blog.objects.all(), source='blogs',
        write_only=True, required=False,
    )

    class Meta(PlaylistSummarySerializer.Meta):
        fields = PlaylistSummarySerializer.Meta.fields + ('blogs', 'blog_ids')

    def get_blogs(self, obj) -> list:
        blogs = obj.blogs.filter(is_published=True)
        return BlogSerializer(blogs, many=True, context=self.context).data


class ContactEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEntry
        fields = ('id', 'name', 'email', 'subject', 'message', 'is_read', 'created_at')
        read_only_fields = ('id', 'is_read', 'created_at')

    def validate_name(self, value):
        return clean_text(value)

    def validate_subject(self, value):
        return clean_text(value)

    def validate_message(self, value):
        return clean_text(value)
