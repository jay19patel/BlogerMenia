"""allauth adapters.

Their only job is to redirect somewhere useful once the LinkedIn dance is done.
allauth's defaults land on `LOGIN_REDIRECT_URL` and the `socialaccount_connections`
view, both of which assume Django renders the site — it does not. Every one of
these hooks instead points at the frontend's handoff route, which trades the
single-use code for a JWT pair and sets the app's session cookies.

See `accounts.services.social_handoff` for why a code and not the tokens.
"""
from urllib.parse import urlencode

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings

from accounts.services.social_handoff import issue_code


def handoff_url(request, next_path: str = "/") -> str:
    query = urlencode({"code": issue_code(request.user), "next": next_path})
    return f"{settings.FRONTEND_URL}/api/auth/social/handoff/?{query}"


class AccountAdapter(DefaultAccountAdapter):
    """Covers both a social login and a social signup — allauth logs the new
    user in and then asks for the login redirect either way."""

    def get_login_redirect_url(self, request):
        return handoff_url(request)

    def get_signup_redirect_url(self, request):
        return handoff_url(request)

    def get_logout_redirect_url(self, request):
        return f"{settings.FRONTEND_URL}/"


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """Connecting LinkedIn to an account that is already signed in. The user
    keeps their session, so the handoff only has to refresh the app's cookies
    and put them back on the connections page."""

    def get_connect_redirect_url(self, request, socialaccount):
        return handoff_url(request, "/accounts/social/connections/")
