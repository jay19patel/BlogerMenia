"""Slug generation.

The old implementation ran one `EXISTS` query per collision and was a
check-then-act race: two simultaneous posts with the same title both saw the
slug as free, and the second hit the unique constraint as an unhandled
`IntegrityError` — a 500 rather than a validation error. This takes the taken
set in a single query, and `SlugModelMixin` handles the race that remains.
"""
import secrets

from django.db import IntegrityError, transaction
from django.utils.text import slugify

SUFFIX_ROOM = 12  # leaves space for "-123" or "-a1b2c3"


def unique_slug(model, value: str, *, instance_pk=None, max_length: int = 255) -> str:
    """A slug for `value` that no other row of `model` is using."""
    base = slugify(value)[: max_length - SUFFIX_ROOM] or "untitled"

    taken = set(
        model._default_manager.filter(slug__startswith=base)
        .exclude(pk=instance_pk)
        .values_list("slug", flat=True)
    )
    if base not in taken:
        return base

    counter = 1
    while f"{base}-{counter}" in taken:
        counter += 1
    return f"{base}-{counter}"


class SlugModelMixin:
    """Fills `slug` from `slug_source` on first save, and survives a lost race.

    The slug is generated once and then left alone: changing it when the title
    changes would break every published link to the post.
    """

    slug_source = "title"
    _slug_retries = 3

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(
                type(self), getattr(self, self.slug_source), instance_pk=self.pk
            )

        for attempt in range(self._slug_retries):
            try:
                # A savepoint so a failed attempt does not poison an outer
                # transaction — without it the retry would fail too.
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError:
                last_attempt = attempt == self._slug_retries - 1
                if last_attempt or not self._slug_collision():
                    raise
                # Someone took our slug between the lookup and the insert.
                base = self.slug.rsplit("-", 1)[0] or self.slug
                self.slug = f"{base}-{secrets.token_hex(3)}"
                # An INSERT that failed must not be retried as an UPDATE.
                kwargs.pop("force_insert", None)

    def _slug_collision(self) -> bool:
        return (
            type(self)._default_manager.filter(slug=self.slug).exclude(pk=self.pk).exists()
        )
