"""
Custom application exceptions.
All HTTP mapping happens in the API layer (routers), not here.
"""


class AppError(Exception):
    """Base for all application errors."""


class NotFoundError(AppError):
    """Requested resource does not exist."""


class ForbiddenError(AppError):
    """Caller is authenticated but not allowed to perform this action."""


class UnauthorizedError(AppError):
    """Caller must be authenticated to perform this action."""


class ConflictError(AppError):
    """Resource already exists (e.g. duplicate slug)."""


class ValidationError(AppError):
    """Input data is invalid."""
