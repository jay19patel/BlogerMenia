from allauth.socialaccount.adapter import get_adapter
from allauth.socialaccount.providers.oauth2.views import (
    OAuth2Adapter,
    OAuth2CallbackView,
    OAuth2LoginView,
)


class LinkedInOIDCAdapter(OAuth2Adapter):
    """
    Adapter for LinkedIn's OpenID Connect product.
    LinkedIn deprecated r_liteprofile + r_emailaddress for new apps.
    Use /v2/userinfo (OIDC) instead of the old /v2/me API.
    """

    provider_id = "linkedin_oauth2"
    access_token_url = "https://www.linkedin.com/oauth/v2/accessToken"  # nosec
    authorize_url = "https://www.linkedin.com/oauth/v2/authorization"
    profile_url = "https://api.linkedin.com/v2/userinfo"

    def complete_login(self, request, app, token, **kwargs):
        extra_data = self._get_userinfo(token)
        return self.get_provider().sociallogin_from_response(request, extra_data)

    def _get_userinfo(self, token):
        headers = {"Authorization": f"Bearer {token.token}"}
        with get_adapter().get_requests_session() as sess:
            resp = sess.get(self.profile_url, headers=headers)
            resp.raise_for_status()
            return resp.json()


oauth2_login = OAuth2LoginView.adapter_view(LinkedInOIDCAdapter)
oauth2_callback = OAuth2CallbackView.adapter_view(LinkedInOIDCAdapter)
