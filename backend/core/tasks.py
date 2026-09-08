"""One retry policy for every Celery task in the project.

Before this there were three: 5 retries with backoff in `search`, 3 in `blog`, a
manual flat 60-second `self.retry` in `accounts`, and none at all on the delete
path. Worse, they all retried `Exception`, so a task that could never succeed —
a post with no text to embed — still burned its full retry budget.

Raise `TransientError` for something worth trying again, `PermanentError` for
something that will fail identically every time.
"""
import logging

logger = logging.getLogger(__name__)


class TransientError(Exception):
    """Upstream was unavailable, rate-limited, or timed out. Retry."""


class PermanentError(Exception):
    """The input cannot produce a result. Do not retry."""


# Spread as **RETRY_POLICY into @shared_task.
RETRY_POLICY = {
    "autoretry_for": (TransientError,),
    "retry_backoff": 2,          # 2s, 4s, 8s, ...
    "retry_backoff_max": 300,
    "retry_jitter": True,        # avoid a thundering herd after an outage
    "max_retries": 5,
}

# Substrings that mark an upstream failure as worth retrying. Gemini and Milvus
# both surface these as plain exceptions with no usable type hierarchy.
_TRANSIENT_MARKERS = (
    "timeout", "timed out", "connection", "unavailable", "temporarily",
    "rate limit", "resource_exhausted", "429", "500", "502", "503", "504",
    "deadline", "reset by peer", "broken pipe",
)


def classify(exc: BaseException) -> Exception:
    """Wrap an arbitrary upstream exception as transient or permanent."""
    text = f"{type(exc).__name__}: {exc}".lower()
    if any(marker in text for marker in _TRANSIENT_MARKERS):
        return TransientError(str(exc))
    return PermanentError(str(exc))
