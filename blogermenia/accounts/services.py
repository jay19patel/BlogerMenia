import logging
import requests
from django.core.files.base import ContentFile
from allauth.socialaccount.models import SocialToken

logger = logging.getLogger(__name__)


class LinkedInService:
    def __init__(self, user):
        self.user = user
        self.token = self._get_token()

    def _get_token(self):
        return SocialToken.objects.filter(
            account__user=self.user,
            account__provider__in=['linkedin', 'linkedin_oauth2']
        ).first()

    def sync_profile(self):
        """
        Applies the cached LinkedIn profile data (from allauth ``extra_data``,
        populated at login) onto the user.

        Runs on every login, but is careful to only apply one-time defaults
        (like enabling auto-post) on the *first* connection — it never
        overrides a choice the user has since made in their profile settings.
        """
        if not self.token:
            logger.warning(f"LinkedInService: No token found for user {self.user.username}")
            return False

        try:
            extra_data = self.token.account.extra_data
            first_connect = not self.user.linkedin_connected

            # Mark the OAuth link as active (used across the UI instead of
            # re-querying socialaccount every time).
            self.user.linkedin_connected = True

            # Opt the user into auto-posting only the first time they connect.
            # On later logins we respect whatever they set in profile settings.
            if first_connect:
                self.user.auto_post_to_linkedin = True

            # 1. Save profile picture from extra_data (first time only).
            picture_url = extra_data.get('picture')
            if picture_url and not self.user.profile_picture:
                try:
                    img_resp = requests.get(picture_url, timeout=5)
                    if img_resp.status_code == 200:
                        self.user.profile_picture.save(
                            f"{self.user.username}_linkedin.jpg",
                            ContentFile(img_resp.content),
                            save=False
                        )
                except requests.RequestException as e:
                    logger.warning(f"Could not fetch LinkedIn picture for {self.user.username}: {e}")

            # 2. Trust LinkedIn's verified email and mark ours verified too.
            if extra_data.get('email_verified'):
                from allauth.account.models import EmailAddress
                email_obj = EmailAddress.objects.filter(
                    user=self.user, email__iexact=self.user.email
                ).first()
                if email_obj and not email_obj.verified:
                    email_obj.verified = True
                    email_obj.save()

            self.user.save()
            logger.info(f"LinkedIn profile synced successfully for {self.user.username}")
            return True
        except Exception as e:
            logger.error(f"Error syncing LinkedIn profile for {self.user.username}: {e}")
            return False

    def _build_post_text(self, blog, blog_url):
        """Compose the LinkedIn share text from the blog's own fields."""
        parts = [blog.title.strip()]

        summary = (blog.excerpt or blog.subtitle or '').strip()
        if summary:
            parts.append(summary)

        parts.append(f"Read the full post here: {blog_url}")

        if blog.tags:
            hashtags = " ".join(
                f"#{str(tag).strip().replace(' ', '')}"
                for tag in blog.tags[:5] if str(tag).strip()
            )
            if hashtags:
                parts.append(hashtags)

        return "\n\n".join(parts)

    def create_post(self, blog, domain_url):
        """
        Publishes a UGC post linking to ``blog`` on the user's LinkedIn feed.

        Whether posting is *allowed* (checkbox, profile opt-in, manual share)
        is decided by the caller — this method only enforces hard invariants
        (connected account, published blog). Returns the post URL on success,
        or ``None`` for a skip. Transient LinkedIn API failures are raised so
        the Celery task can retry them.
        """
        if not self.token:
            logger.warning(f"LinkedIn post skipped: no token for {self.user.username}")
            return None

        if not blog.is_published:
            logger.info(f"LinkedIn post skipped: blog '{blog.slug}' is not published.")
            return None

        author_urn = f"urn:li:person:{self.token.account.uid}"
        blog_url = f"{domain_url.rstrip('/')}{blog.get_absolute_url()}"
        text = self._build_post_text(blog, blog_url)

        payload = {
            "author": author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
        }

        from linkedin_api.clients.restli.client import RestliClient
        restli_client = RestliClient()
        response = restli_client.create(
            resource_path="/ugcPosts",
            entity=payload,
            access_token=self.token.token,
        )

        url = f"https://www.linkedin.com/feed/update/{response.entity_id}/"
        logger.info(
            f"Posted blog '{blog.slug}' to LinkedIn for {self.user.username}. URL: {url}"
        )
        return url
