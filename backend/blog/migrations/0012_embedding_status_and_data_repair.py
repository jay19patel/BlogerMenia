"""Embedding status tracking, slug integrity, upload validation — and a repair.

The repair is the important part. The editor submitted `sections` and `tags` as
JSON *strings* inside a multipart form, and DRF's JSONField stores a multipart
string verbatim, so those columns hold `'[{"type": "text"}]'` where every reader
expects a list. This decodes them in place.
"""
import json

import django.db.models.deletion
from django.db import migrations, models
from django.utils.text import slugify

import core.validators


def _decode(value, empty):
    """Turn a stringified JSON column back into the value it should hold."""
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    if not stripped:
        return empty
    try:
        decoded = json.loads(stripped)
    except (ValueError, TypeError):
        # A tags column holding a bare word rather than JSON — treat the whole
        # thing as a single tag rather than losing it.
        return [stripped] if empty == [] else empty
    return decoded if isinstance(decoded, list) else empty


def repair_stringified_json(apps, schema_editor):
    Blog = apps.get_model('blog', 'Blog')

    repaired = 0
    for blog in Blog.objects.all().iterator(chunk_size=200):
        updates = {}

        fixed_sections = _decode(blog.sections, [])
        if fixed_sections is not None:
            updates['sections'] = [s for s in fixed_sections if isinstance(s, dict)]

        fixed_tags = _decode(blog.tags, [])
        if fixed_tags is not None:
            updates['tags'] = [str(t) for t in fixed_tags if t]

        if updates:
            Blog.objects.filter(pk=blog.pk).update(**updates)
            repaired += 1

    if repaired:
        print(f"\n  repaired {repaired} blog(s) whose sections/tags were stored as strings")


def fill_playlist_slugs(apps, schema_editor):
    """Give every playlist a unique slug before the column becomes unique.

    `Playlist.slug` was nullable and non-unique, so duplicates and NULLs are
    both possible — and `PlaylistDetailView` looks playlists up by slug, which
    means a duplicate raises MultipleObjectsReturned on read.
    """
    Playlist = apps.get_model('blog', 'Playlist')

    taken = set()
    for playlist in Playlist.objects.order_by('pk').iterator(chunk_size=200):
        base = (playlist.slug or slugify(playlist.title) or 'playlist')[:243]
        slug = base
        counter = 1
        while slug in taken:
            slug = f"{base}-{counter}"
            counter += 1
        taken.add(slug)
        if slug != playlist.slug:
            Playlist.objects.filter(pk=playlist.pk).update(slug=slug)


def noop(apps, schema_editor):
    """Both repairs are one-way: the previous state was corrupt, not a version."""


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0011_blog_linkedin_post_url'),
    ]

    operations = [
        migrations.RunPython(repair_stringified_json, noop),
        migrations.RunPython(fill_playlist_slugs, noop),
        migrations.AddField(
            model_name='blog',
            name='embedding_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('indexed', 'Indexed'),
                    ('failed', 'Failed'),
                    ('skipped', 'Skipped (nothing to index)'),
                ],
                db_index=True, default='pending', max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='blog',
            name='embedding_error',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='blog',
            name='embedded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='blog',
            name='embedding_hash',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AlterField(
            model_name='blog',
            name='image',
            field=models.ImageField(
                blank=True, null=True, upload_to='blog_images/',
                validators=[core.validators.validate_image],
            ),
        ),
        migrations.AlterField(
            model_name='playlist',
            name='image',
            field=models.ImageField(
                blank=True, null=True, upload_to='playlist_images/',
                validators=[core.validators.validate_image],
            ),
        ),
        migrations.AlterField(
            model_name='playlist',
            name='slug',
            field=models.SlugField(blank=True, max_length=255, unique=True),
        ),
        migrations.AddIndex(
            model_name='blog',
            index=models.Index(
                fields=['is_published', '-created_at'], name='blog_published_recent_idx'
            ),
        ),
    ]
