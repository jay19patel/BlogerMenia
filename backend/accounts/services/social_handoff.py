"""Handing a completed social login over to the Next.js app.

The LinkedIn dance has to run against Django — allauth owns the redirect URLs
and the provider's registered callback — but it ends in a Django session, and
the Next.js app authenticates with SimpleJWT cookies it sets itself. Something
has to carry the identity across that boundary.

Putting the token pair in the callback's redirect URL would do it, and would
also write both tokens into the browser's history, the referrer of the next
request, and every proxy log in between. So the redirect carries a single-use
code instead, and the frontend redeems it server-to-server for the real tokens.

The codes live in the cache rather than a table: they are valid for a minute and
there is nothing worth keeping once redeemed.
"""
import secrets

from django.contrib.auth import get_user_model
from django.core.cache import cache

# A code is redeemed by the frontend immediately after the redirect, so this
# only has to survive one browser round trip.
TTL_SECONDS = 60

_PREFIX = "social-handoff:"


def issue_code(user) -> str:
    code = secrets.token_urlsafe(32)
    cache.set(f"{_PREFIX}{code}", user.pk, TTL_SECONDS)
    return code


def redeem_code(code: str):
    """The user `code` was issued for, or None. Single use: the code dies here.

    Deleting before the user lookup means a code cannot be replayed even if two
    requests arrive at once.
    """
    key = f"{_PREFIX}{code}"
    user_pk = cache.get(key)
    if user_pk is None:
        return None
    cache.delete(key)
    return get_user_model().objects.filter(pk=user_pk, is_active=True).first()
