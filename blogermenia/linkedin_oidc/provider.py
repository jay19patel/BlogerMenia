from allauth.socialaccount.providers.base import ProviderAccount
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider

from .views import LinkedInOIDCAdapter


class LinkedInOIDCAccount(ProviderAccount):
    def to_str(self):
        name = self.account.extra_data.get("name", "")
        return name or super().to_str()

    def get_avatar_url(self):
        return self.account.extra_data.get("picture") or super().get_avatar_url()


class LinkedInOIDCProvider(OAuth2Provider):
    # Keep same id so existing SocialApplication DB records are reused
    id = "linkedin_oauth2"
    name = "LinkedIn"
    account_class = LinkedInOIDCAccount
    oauth2_adapter_class = LinkedInOIDCAdapter

    def get_default_scope(self):
        return ["openid", "profile", "email", "w_member_social"]

    def extract_uid(self, data):
        # OIDC userinfo returns "sub" (not "id")
        return str(data["sub"])

    def extract_common_fields(self, data):
        return {
            "first_name": data.get("given_name", ""),
            "last_name": data.get("family_name", ""),
            "email": data.get("email", ""),
        }


provider_classes = [LinkedInOIDCProvider]
