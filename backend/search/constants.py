"""Shared identifiers for the kinds of objects we index for search."""

KIND_BLOG = 'blog'
KIND_PLAYLIST = 'playlist'
KIND_PROFILE = 'profile'

KIND_CHOICES = (KIND_BLOG, KIND_PLAYLIST, KIND_PROFILE)

# Human-facing label per kind (shown as the badge in the search dropdown).
KIND_LABELS = {
    KIND_BLOG: 'Blog',
    KIND_PLAYLIST: 'Playlist',
    KIND_PROFILE: 'Person',
}


def doc_id(kind: str, pk) -> str:
    """Stable Chroma document id for an object, e.g. 'blog:12'."""
    return f"{kind}:{pk}"
