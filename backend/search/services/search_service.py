"""Semantic search across blogs, playlists and profiles, backed by Milvus.

Each object is embedded (via Gemini/LangChain) and stored in a persistent Milvus
collection keyed by a stable id like ``blog:12``. A search embeds the query, lets
Milvus find the nearest documents, then loads the *real* Django model instances
to render results.
"""
import hashlib
import logging
from typing import Any, Dict, List, Optional, Set

from django.conf import settings
from django.db.models import Count
from django.utils.html import strip_tags
from langchain_core.documents import Document
from langchain_milvus import Milvus

from core.text import blog_text
from .. import constants as C
from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

_COLLECTION_NAME = 'blogermenia'
# Embedding cost scales with text length, and Gemini has its own input ceiling.
# 8k characters covers a long technical article; anything past that is
# diminishing returns for retrieval.
_MAX_TEXT_CHARS = 8000


class SearchService:
    """Build the Milvus index and run semantic queries against it."""

    _store: Optional[Milvus] = None

    @classmethod
    def store(cls) -> Milvus:
        """Return the shared, persistent Milvus vector store (created lazily)."""
        if cls._store is None:
            cls._store = Milvus(
                collection_name=_COLLECTION_NAME,
                embedding_function=EmbeddingService.get_embeddings(),
                connection_args={"uri": str(settings.MILVUS_URI)},
                auto_id=False,
                drop_old=False,
                # Gemini embeddings are normalised, so cosine is the metric the
                # relevance scores are actually valid for. The default (L2)
                # made `min_score` mean nothing.
                index_params={"metric_type": "COSINE"},
            )
        return cls._store

    # ------------------------------------------------------------------ text

    @classmethod
    def _build_text(cls, kind: str, obj) -> str:
        if kind == C.KIND_BLOG:
            # Structured posts leave `content` blank, so the old implementation
            # — title + category + content — embedded them by title alone.
            return blog_text(obj, limit=_MAX_TEXT_CHARS)
        if kind == C.KIND_PLAYLIST:
            parts = [obj.title, strip_tags(obj.description or '')]
        elif kind == C.KIND_PROFILE:
            parts = [obj.get_full_name() or obj.username, obj.username, obj.bio or '', obj.about or '']
        else:
            return ''
        return '. '.join(p for p in parts if p)[:_MAX_TEXT_CHARS]

    @staticmethod
    def text_hash(text: str) -> str:
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    # --------------------------------------------------------------- indexing

    @classmethod
    def index_object(cls, kind: str, obj) -> str:
        """(Re)build the embedding for one object. Returns the text hash.

        Raises on failure rather than returning False: the caller is a Celery
        task whose retry policy needs to see the difference between "Gemini is
        down" and "there is nothing here to index".
        """
        from core.tasks import PermanentError, classify

        text = cls._build_text(kind, obj)
        if not text.strip():
            raise PermanentError(f"{C.doc_id(kind, obj.pk)} has no text to index")

        doc_id = C.doc_id(kind, obj.pk)
        document = Document(page_content=text, metadata={'kind': kind, 'object_id': obj.pk})

        try:
            # upsert is atomic; the old delete-then-add left a window where the
            # object was missing from the index entirely if the worker died.
            cls.store().upsert(ids=[doc_id], documents=[document])
        except Exception as exc:
            logger.error("Failed to index %s: %s", doc_id, exc)
            raise classify(exc) from exc

        logger.info("Indexed %s (%d chars)", doc_id, len(text))
        return cls.text_hash(text)

    @classmethod
    def remove_object(cls, kind: str, object_id) -> None:
        from core.tasks import classify

        doc_id = C.doc_id(kind, object_id)
        try:
            cls.store().delete(ids=[doc_id])
        except Exception as exc:
            logger.error("Failed to remove %s: %s", doc_id, exc)
            raise classify(exc) from exc

    @classmethod
    def indexed_ids(cls) -> Set[str]:
        """Every document id currently in the collection.

        This used to be `hasattr(store, 'get')` — a ChromaDB API. Milvus has no
        `get`, so the check was always False, the "only index what's missing"
        path silently became a full rebuild, and every scheduled sweep
        re-embedded the entire corpus against a paid API.
        """
        try:
            pks = cls.store().get_pks('pk != ""')
        except Exception as exc:
            logger.error("Could not read existing Milvus ids: %s", exc)
            return set()
        return {str(pk) for pk in (pks or [])}

    @classmethod
    def _querysets(cls):
        """Map each kind to the queryset of objects that should be indexed."""
        from django.contrib.auth import get_user_model

        from blog.models import Blog, Playlist

        return {
            C.KIND_BLOG: Blog.objects.filter(is_published=True).select_related('category'),
            C.KIND_PLAYLIST: Playlist.objects.all(),
            C.KIND_PROFILE: get_user_model().objects.filter(is_active=True),
        }

    @classmethod
    def reindex_all(cls, only_missing: bool = False) -> int:
        """(Re)index everything, or only what is missing. Returns the count."""
        from blog.models import Blog, EmbeddingStatus

        existing = cls.indexed_ids() if only_missing else set()

        # A blog whose last indexing attempt failed needs retrying even though
        # a stale vector for it may still exist.
        needs_retry = set()
        if only_missing:
            needs_retry = {
                C.doc_id(C.KIND_BLOG, pk)
                for pk in Blog.objects.exclude(
                    embedding_status=EmbeddingStatus.INDEXED
                ).values_list('pk', flat=True)
            }

        count = 0
        for kind, queryset in cls._querysets().items():
            for obj in queryset.iterator(chunk_size=100):
                doc_id = C.doc_id(kind, obj.pk)
                if only_missing and doc_id in existing and doc_id not in needs_retry:
                    continue
                if cls._index_and_record(kind, obj):
                    count += 1

        logger.info("reindex_all complete: %d indexed (only_missing=%s)", count, only_missing)
        return count

    @classmethod
    def _index_and_record(cls, kind: str, obj) -> bool:
        """Index one object, recording the outcome on the blog when it is one.

        Used by the bulk sweep, which must not abort the whole run because a
        single object failed.
        """
        from .indexing import record_failure, record_success

        try:
            digest = cls.index_object(kind, obj)
        except Exception as exc:  # noqa: BLE001 — a sweep reports and moves on
            if kind == C.KIND_BLOG:
                record_failure(obj.pk, exc)
            logger.warning("Skipping %s: %s", C.doc_id(kind, obj.pk), exc)
            return False

        if kind == C.KIND_BLOG:
            record_success(obj.pk, digest)
        return True

    @classmethod
    def prune_orphans(cls) -> int:
        """Delete vectors whose backing row is gone.

        A delete that happened while Milvus was unreachable leaves a vector
        behind, and because `_resolve` silently drops ids it cannot load, the
        orphan is invisible rather than error-producing.
        """
        from django.contrib.auth import get_user_model

        from blog.models import Blog, Playlist

        live = {
            C.KIND_BLOG: set(Blog.objects.values_list('pk', flat=True)),
            C.KIND_PLAYLIST: set(Playlist.objects.values_list('pk', flat=True)),
            C.KIND_PROFILE: set(get_user_model().objects.values_list('pk', flat=True)),
        }

        orphans = []
        for doc_id in cls.indexed_ids():
            kind, _, raw_pk = doc_id.partition(':')
            if kind not in live:
                orphans.append(doc_id)
                continue
            try:
                if int(raw_pk) not in live[kind]:
                    orphans.append(doc_id)
            except ValueError:
                orphans.append(doc_id)

        if orphans:
            cls.store().delete(ids=orphans)
            logger.info("Pruned %d orphaned embedding(s)", len(orphans))
        return len(orphans)

    # ----------------------------------------------------------------- search

    @classmethod
    def search(cls, query: str, limit: int = 8, min_score: float = 0.1) -> List[Dict[str, Any]]:
        """Return the top matching blogs/playlists/profiles for a text query."""
        query = (query or '').strip()
        if not query:
            return []
        try:
            matches = cls.store().similarity_search_with_relevance_scores(query, k=limit)
        except Exception as exc:
            logger.error("Search failed: %s", exc)
            raise

        scored = [
            (score, doc.metadata.get('kind'), doc.metadata.get('object_id'))
            for doc, score in matches
            if score >= min_score
        ]
        return cls._resolve(scored)

    @classmethod
    def _resolve(cls, scored) -> List[Dict[str, Any]]:
        """Turn (score, kind, id) tuples into display dicts using the real models."""
        from django.contrib.auth import get_user_model

        from blog.models import Blog, Playlist

        ids = {kind: [] for kind in C.KIND_CHOICES}
        for _, kind, obj_id in scored:
            if kind in ids and obj_id is not None:
                ids[kind].append(obj_id)

        # `is_published` is re-checked here, not just at index time: a post
        # unpublished after indexing would otherwise stay searchable until the
        # next sweep.
        blogs = (
            Blog.objects.filter(is_published=True)
            .select_related('category', 'author')
            .in_bulk(ids[C.KIND_BLOG])
        )
        playlists = Playlist.objects.annotate(
            blog_count_annotated=Count('blogs', distinct=True)
        ).in_bulk(ids[C.KIND_PLAYLIST])
        profiles = get_user_model().objects.filter(is_active=True).in_bulk(ids[C.KIND_PROFILE])

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
        count = getattr(obj, 'blog_count_annotated', None)
        if count is None:
            count = obj.blogs.count()
        return {
            'kind': C.KIND_PLAYLIST,
            'label': C.KIND_LABELS[C.KIND_PLAYLIST],
            'title': obj.title,
            'subtitle': f"{count} articles",
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
