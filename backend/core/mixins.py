"""View mixins shared across apps."""
from rest_framework import status
from rest_framework.exceptions import APIException


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = (
        "This has been changed by someone else since you loaded it. "
        "Reload to see the current version before saving again."
    )
    default_code = "conflict"


class OptimisticLockMixin:
    """Refuse a write that was composed against a stale copy of the object.

    The client echoes back the `updated_at` it last saw as
    `expected_updated_at`; if the stored value has moved on, someone else saved
    in between and blindly applying this write would discard their edit. Clients
    that omit the field keep the old last-write-wins behaviour, so this is
    backwards compatible.
    """

    lock_field = "updated_at"

    def perform_update(self, serializer):
        expected = self.request.data.get("expected_updated_at")
        if expected:
            current = getattr(serializer.instance, self.lock_field, None)
            if current is not None and _to_iso(current) != _normalise(expected):
                raise Conflict()
        serializer.save()


def _to_iso(value) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _normalise(value: str) -> str:
    return str(value).strip().replace("+00:00", "Z")
