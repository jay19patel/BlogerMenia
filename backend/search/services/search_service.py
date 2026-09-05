"""Semantic search across blogs, playlists and profiles, backed by Milvus.

Each object is embedded (via Gemini/LangChain) and stored in a persistent Milvus
collection keyed by a stable id like ``blog:12``. A search embeds the query, lets
Milvus find the nearest documents, then loads the *real* Django model instances
(Blog / Playlist / CustomUser) to render results.
"""
import logging
import os
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.urls import reverse
from django.utils.html import strip_tags
from langchain_milvus import Milvus

from .. import constants as C
from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

_COLLECTION_NAME = 'blogermenia'
_MAX_TEXT_CHARS = 2000  # cap embedded text length; titles dominate relevance anyway


class SearchService:
    """Build the Milvus index and run semantic queries against it."""

    _store: Optional[Milvus] = None

    @classmethod
    def store(cls) -> Milvus:
        """Return the shared, persistent Milvus vector store (created lazily)."""
        if cls._store is None:
            milvus_uri = getattr(
                settings, 'MILVUS_URI',
                os.path.join(settings.BASE_DIR, 'search/milvus.db'),
            )
            cls._store = Milvus(
                collection_name=_COLLECTION_NAME,
                embedding_function=EmbeddingService.get_embeddings(),
                connection_args={"uri": str(milvus_uri)},
                auto_id=False,
                drop_old=False,
            )
        return cls._store

    # ------------------------------------------------------------------ text

    @staticmethod
    def _blog_text(obj) -> str:
        parts = [obj.title]
        if obj.category:
            parts.append(obj.category.name)
        parts.append(strip_tags(obj.content or ''))
        return '. '.join(p for p in parts if p)[:_MAX_TEXT_CHARS]

    @staticmethod
    def _playlist_text(obj) -> str:
        parts = [obj.title, obj.description or '']
        return '. '.join(p for p in parts if p)[:_MAX_TEXT_CHARS]

    @staticmethod
    def _profile_text(obj) -> str:
        parts = [obj.get_full_name() or obj.username, obj.username, obj.bio or '', obj.about or '']
        return '. '.join(p for p in parts if p)[:_MAX_TEXT_CHARS]

    @classmethod
    def _build_text(cls, kind: str, obj) -> str:
        if kind == C.KIND_BLOG:
            return cls._blog_text(obj)
        if kind == C.KIND_PLAYLIST:
            return cls._playlist_text(obj)
        if kind == C.KIND_PROFILE:
            return cls._profile_text(obj)
        return ''

    # --------------------------------------------------------------- indexing

    @classmethod
    def index_object(cls, kind: str, obj) -> bool:
        """Create or update the embedding for a single object. Returns True on success."""
        text = cls._build_text(kind, obj)
        if not text:
            return False
        doc_id = C.doc_id(kind, obj.pk)
        try:
            store = cls.store()
            try:
                store.delete(ids=[doc_id])  # ensure upsert semantics
            except Exception:
                pass # it may not exist yet
            store.add_texts(
                texts=[text],
                metadatas=[{'kind': kind, 'object_id': obj.pk}],
                ids=[doc_id],
            )
            logger.info(f"Indexed {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to index {doc_id} (check GOOGLE_API_KEY): {e}")
            return False

    @classmethod
    def remove_object(cls, kind: str, object_id) -> None:
        try:
            cls.store().delete(ids=[C.doc_id(kind, object_id)])
        except Exception as e:
            logger.error(f"Failed to remove {C.doc_id(kind, object_id)}: {e}")

    @classmethod
    def _querysets(cls):
        """Map each kind to the queryset of objects that should be indexed."""
        from blog.models import Blog, Playlist
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return {
            C.KIND_BLOG: Blog.objects.filter(is_published=True),
            C.KIND_PLAYLIST: Playlist.objects.all(),
            C.KIND_PROFILE: User.objects.filter(is_active=True),
        }

    @classmethod
    def reindex_all(cls, only_missing: bool = False) -> int:
        """(Re)build the index for every object. Returns the number indexed."""
        existing = set()
        if only_missing:
            try:
                # Attempt to get existing ids if supported
                if hasattr(cls.store(), 'get'):
                    existing = set(cls.store().get(include=[]).get('ids', []))
            except Exception as e:
                logger.error(f"Could not read existing Milvus ids: {e}")

        count = 0
        for kind, qs in cls._querysets().items():
            for obj in qs:
                if only_missing and C.doc_id(kind, obj.pk) in existing:
                    continue
                if cls.index_object(kind, obj):
                    count += 1
        logger.info(f"reindex_all complete: {count} indexed (only_missing={only_missing})")
        return count

    # ----------------------------------------------------------------- search

    @classmethod
    def search(cls, query: str, limit: int = 8, min_score: float = 0.1) -> List[Dict[str, Any]]:
        """Return the top matching blogs/playlists/profiles for a text query."""
        query = (query or '').strip()
        if not query:
            return []
        try:
            matches = cls.store().similarity_search_with_relevance_scores(query, k=limit)
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

        scored = [
            (score, doc.metadata.get('kind'), doc.metadata.get('object_id'))
            for doc, score in matches
            if score >= min_score
        ]
        return cls._resolve(scored)

    @classmethod
    def _resolve(cls, scored) -> List[Dict[str, Any]]:
        """Turn (score, kind, id) tuples into display dicts using the real models."""
        from blog.models import Blog, Playlist
        from django.contrib.auth import get_user_model
        User = get_user_model()

        ids = {k: [] for k in C.KIND_CHOICES}
        for _, kind, obj_id in scored:
            if kind in ids and obj_id is not None:
                ids[kind].append(obj_id)

        blogs = Blog.objects.select_related('category', 'author').in_bulk(ids[C.KIND_BLOG])
        playlists = Playlist.objects.in_bulk(ids[C.KIND_PLAYLIST])
        profiles = User.objects.in_bulk(ids[C.KIND_PROFILE])

        results = []
        for score, kind, obj_id in scored:
            data = None
            if kind == C.KIND_BLOG and obj_id in blogs:
                data = cls._blog_result(blogs[obj_id])
            elif kind == C.KIND_PLAYLIST and obj_id in playlists:
                data = cls._playlist_result(playlists[obj_id])
            elif kind == C.KIND_PROFILE and obj_id in profiles:
                data = cls._profile_result(profiles[obj_id])
            if data:
                data['score'] = round(float(score), 4)
                results.append(data)
        return results

    @staticmethod
    def _blog_result(obj) -> Dict[str, Any]:
        return {
            'kind': C.KIND_BLOG,
            'label': C.KIND_LABELS[C.KIND_BLOG],
            'title': obj.title,
            'subtitle': obj.category.name if obj.category else 'Article',
            'url': f"/blogs/{obj.slug}",
            'image_url': obj.image.url if obj.image else None,
            'icon_html': None if obj.image else obj.avatar_svg,
            'posted_on_linkedin': obj.posted_on_linkedin,
            'linkedin_post_url': obj.linkedin_post_url,
        }

    @staticmethod
    def _playlist_result(obj) -> Dict[str, Any]:
        return {
            'kind': C.KIND_PLAYLIST,
            'label': C.KIND_LABELS[C.KIND_PLAYLIST],
            'title': obj.title,
            'subtitle': f"{obj.blogs.count()} articles",
            'url': f"/playlists/{obj.slug}",
            'image_url': obj.image.url if obj.image else None,
            'icon_html': None if obj.image else obj.avatar_svg,
        }

    @staticmethod
    def _profile_result(obj) -> Dict[str, Any]:
        return {
            'kind': C.KIND_PROFILE,
            'label': C.KIND_LABELS[C.KIND_PROFILE],
            'title': obj.get_full_name() or obj.username,
            'subtitle': f"@{obj.username}",
            'url': f"/profile/{obj.username}",
            'image_url': obj.profile_picture.url if obj.profile_picture else None,
            'icon_html': None if obj.profile_picture else obj.avatar_svg,
        }
