"""Embedding service: Gemini embeddings via LangChain.

Wraps `langchain_google_genai.GoogleGenerativeAIEmbeddings` behind a small
singleton so the rest of the app has one shared embedding client to hand to
the Chroma vector store.
"""
import logging
from typing import List, Optional

from django.conf import settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)

# gemini-embedding-001 is trained for asymmetric retrieval: the *query* gets an
# instruction prefix, while indexed *documents* stay plain. This markedly
# improves relevance, especially for short queries.
_QUERY_INSTRUCTION = (
    "Instruct: Given a search query, retrieve relevant blog posts, playlists "
    "and author profiles that match it.\nQuery: "
)


class InstructedGeminiEmbeddings(GoogleGenerativeAIEmbeddings):
    """GoogleGenerativeAIEmbeddings that prepends the retrieval instruction to queries only."""

    def embed_query(self, text: str) -> List[float]:
        return super().embed_query(f"{_QUERY_INSTRUCTION}{text}")


class EmbeddingService:
    """Provides the LangChain Gemini embedding client and simple embed helpers."""

    _embeddings: Optional[GoogleGenerativeAIEmbeddings] = None

    @classmethod
    def get_embeddings(cls) -> GoogleGenerativeAIEmbeddings:
        """Return the shared GoogleGenerativeAIEmbeddings instance (created lazily)."""
        if cls._embeddings is None:
            model = getattr(settings, 'GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001')
            cls._embeddings = InstructedGeminiEmbeddings(
                model=f"models/{model}",
                google_api_key=settings.GOOGLE_API_KEY,
            )
            logger.info(f"GoogleGenerativeAIEmbeddings initialised with model: {model}")
        return cls._embeddings

    @classmethod
    def embed_query(cls, text: str) -> Optional[List[float]]:
        """Embed a single query string; returns None on failure."""
        if not text:
            return None
        try:
            return cls.get_embeddings().embed_query(text)
        except Exception as e:
            logger.error(f"Error embedding query: {e}")
            return None
