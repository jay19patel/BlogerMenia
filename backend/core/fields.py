"""Serializer fields that behave the same over JSON and multipart.

DRF's `JSONField` only calls `json.loads` when the incoming value is binary or a
file. A `multipart/form-data` request delivers everything as a string, so a form
field holding `'["a","b"]'` is stored verbatim as that *string* — the column ends
up with a str where every reader expects a list, and each consumer downstream
breaks in its own way. These fields decode first.
"""
import json

from rest_framework import serializers
from rest_framework.fields import empty


class JSONListField(serializers.ListField):
    """A list that also accepts its own JSON encoding.

    Three shapes reach here and all three have to work:

    - a real list (a JSON request body) — pass straight through
    - a JSON string (a multipart field set once to `'[...]'`)
    - a single-element list holding that string, which is what DRF's
      `ListField.get_value` hands back for a QueryDict
    """

    def to_internal_value(self, data):
        return super().to_internal_value(self._decode(data))

    @staticmethod
    def _decode(data):
        # DRF unwraps QueryDict values with getlist(), so a single multipart
        # field arrives already wrapped in a list.
        if isinstance(data, (list, tuple)) and len(data) == 1 and isinstance(data[0], str):
            candidate = data[0]
        elif isinstance(data, (str, bytes)):
            candidate = data
        else:
            return data

        stripped = candidate.strip() if isinstance(candidate, str) else candidate
        if not isinstance(stripped, (str, bytes)) or not stripped:
            return data
        # Only try to decode something that looks like a JSON array — a plain
        # multipart field repeated per item (`?tag=a&tag=b`) must stay a list.
        if not (isinstance(stripped, str) and stripped.startswith('[')):
            return data

        try:
            decoded = json.loads(stripped)
        except (ValueError, TypeError):
            raise serializers.ValidationError("Expected valid JSON.")
        return decoded if isinstance(decoded, list) else data


class BooleanField(serializers.BooleanField):
    """A boolean that lets a missing multipart field fall back to the model default.

    DRF assumes an HTML form: an unchecked checkbox sends nothing, so an absent
    boolean means `False`. Our clients are JavaScript — they post multipart only
    because the request carries an image, and they send every boolean
    explicitly. Under DRF's assumption, a create that simply omitted
    `is_published` silently saved a draft instead of publishing.
    """

    # `False` in DRF; `empty` means "not provided", so the model default applies.
    default_empty_html = empty
