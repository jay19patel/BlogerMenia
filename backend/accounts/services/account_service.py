import logging

import requests
from allauth.socialaccount.models import SocialToken
from django.core.files.base import ContentFile

from . import linkedin_share

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

    def _attach_pdf(self, blog, author_urn):
        """Upload the post's PDF and return its document URN, or None.

        Deliberately swallowing every failure: a share with no attachment still
        reaches the author's network, and losing the whole post because a
        document upload timed out is the worse trade. The caller logs what the
        reader ends up seeing either way.
        """
        from blog.services.pdf_service import blog_pdf, pdf_filename

        try:
            data = blog_pdf(blog)
        except Exception as exc:  # noqa: BLE001 — ReportLab raises bare exceptions
            logger.warning("LinkedIn: could not render PDF for '%s': %s", blog.slug, exc)
            return None

        try:
            return linkedin_share.upload_document(
                self.token.token, author_urn, pdf_filename(blog), data
            )
        except Exception as exc:  # noqa: BLE001 — the API client raises bare exceptions
            logger.warning("LinkedIn: document upload failed for '%s': %s", blog.slug, exc)
            return None

    def create_post(self, blog):
        """
        Publishes ``blog`` to the user's LinkedIn feed as a document share.

        The post carries the article's own PDF — the same file the author can
        download from the post page — with a short commentary built from the
        title, a one-or-two-sentence description, the public URL and the post's
        tags as hashtags. The URL lives in the text because LinkedIn renders
        either a document or a link preview, never both, and auto-links a URL
        it finds in the words.

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
        # An absolute URL on the Next.js frontend — Django serves no blog pages,
        # so this used to reverse a route that no longer exists.
        blog_url = blog.get_absolute_url()
        commentary = linkedin_share.build_commentary(blog, blog_url)
        document_urn = self._attach_pdf(blog, author_urn)

        try:
            urn = linkedin_share.create_post(
                self.token.token, author_urn, commentary,
                document_urn=document_urn, document_title=blog.title,
            )
        except Exception:
            if not document_urn:
                raise
            # The attachment is the only thing new about this call, so if it is
            # what LinkedIn rejected, the share itself can still go out.
            logger.warning(
                "LinkedIn: document post rejected for '%s'; retrying without the PDF",
                blog.slug, exc_info=True,
            )
            urn = linkedin_share.create_post(self.token.token, author_urn, commentary)
            document_urn = None

        url = linkedin_share.post_url(urn)
        logger.info(
            "Posted blog '%s' to LinkedIn for %s%s. URL: %s",
            blog.slug, self.user.username,
            " with its PDF" if document_urn else " (text only)", url,
        )
        return url
