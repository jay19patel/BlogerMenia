"""Re-exported from `core` so each app has one obvious place to look."""
from core.permissions import IsAuthorOrReadOnly, IsOwnerOrReadOnly

__all__ = ["IsAuthorOrReadOnly", "IsOwnerOrReadOnly"]
