"""Upload validation.

An `ImageField` on its own only checks that Pillow can open the file. It does
not check how big it is, and it happily accepts a format the frontend cannot
render. Both checks belong on the model so the admin enforces them too.
"""
from django.conf import settings
from django.core.exceptions import ValidationError

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "svg"}
ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
}


def validate_image(file) -> None:
    """Reject uploads that are too large or not an image we can serve."""
    max_bytes = getattr(settings, "MAX_UPLOAD_SIZE_MB", 5) * 1024 * 1024
    size = getattr(file, "size", None)
    if size is not None and size > max_bytes:
        raise ValidationError(
            f"Image is too large ({size / 1024 / 1024:.1f} MB). "
            f"The maximum is {max_bytes // 1024 // 1024} MB."
        )

    name = (getattr(file, "name", "") or "").lower()
    extension = name.rsplit(".", 1)[-1] if "." in name else ""
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))
        raise ValidationError(f"Unsupported image type '.{extension}'. Allowed: {allowed}.")

    # Browsers sniff, so a mislabelled content type is a real vector. Only
    # check when the upload actually carries one (it won't on a re-save).
    content_type = getattr(file, "content_type", None)
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError(f"Unsupported image content type '{content_type}'.")
