"""Embedding service: Ollama embeddings via LangChain.

Wraps `langchain_ollama.OllamaEmbeddings` behind a small singleton so the rest of
the app has one shared embedding client to hand to the Chroma vector store.
"""
import logging
from typing import List, Optional

from django.conf import settings
from langchain_ollama import OllamaEmbeddings

logger = logging.getLogger(__name__)

# qwen3-embedding is trained for asymmetric retrieval: the *query* gets an
# instruction prefix, while indexed *documents* stay plain. This markedly
# improves relevance, especially for short queries.
_QUERY_INSTRUCTION = (
    "Instruct: Given a search query, retrieve relevant blog posts, playlists "
    "and author profiles that match it.\nQuery: "
)


class InstructedOllamaEmbeddings(OllamaEmbeddings):
    """OllamaEmbeddings that prepends the retrieval instruction to queries only."""

    def embed_query(self, text: str) -> List[float]:
        return super().embed_query(f"{_QUERY_INSTRUCTION}{text}")


class EmbeddingService:
    """Provides the LangChain Ollama embedding client and simple embed helpers."""

    _embeddings: Optional[OllamaEmbeddings] = None

    @classmethod
    def get_embeddings(cls) -> OllamaEmbeddings:
        """Return the shared OllamaEmbeddings instance (created lazily)."""
        if cls._embeddings is None:
            base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
            model = getattr(settings, 'OLLAMA_EMBEDDING_MODEL', 'qwen3-embedding:0.6b')
            cls._embeddings = InstructedOllamaEmbeddings(base_url=base_url, model=model)
            logger.info(f"OllamaEmbeddings initialised with model: {model}")
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
