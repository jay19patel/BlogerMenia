"""Object-level permissions shared by every app.

`IsAuthenticatedOrReadOnly` on its own only asks *"is this request signed in?"* —
it never asks *"does this object belong to you?"*. Every detail view that can be
written to needs one of these alongside it.
"""
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Writes only by the object itself (used for the user profile)."""

    message = "You can only edit your own profile."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj == request.user


class IsAuthorOrReadOnly(permissions.BasePermission):
    """Writes only by `obj.author`. Staff may always write."""

    message = "You can only edit content you created."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or obj.author_id == user.id))
