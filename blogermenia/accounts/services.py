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
        Fetches the latest profile data from LinkedIn extra_data and applies it to the user.
        Also turns on auto-posting by default.
        """
        if not self.token:
            logger.warning(f"LinkedInService: No token found for user {self.user.username}")
            return False

        # Set auto post to True by default when they sync
        self.user.auto_post_to_linkedin = True
        
        try:
            extra_data = self.token.account.extra_data
            
            # 1. Save profile picture from extra_data
            picture_url = extra_data.get('picture')
            if picture_url and not self.user.profile_picture:
                img_resp = requests.get(picture_url)
                if img_resp.status_code == 200:
                    self.user.profile_picture.save(
                        f"{self.user.username}_linkedin.jpg", 
                        ContentFile(img_resp.content), 
                        save=False
                    )
            
            # 2. Verify Email Address automatically if LinkedIn says it's verified
            if extra_data.get('email_verified'):
                from allauth.account.models import EmailAddress
                email_obj = EmailAddress.objects.filter(user=self.user, email__iexact=self.user.email).first()
                if email_obj and not email_obj.verified:
                    email_obj.verified = True
                    email_obj.save()
                    
            self.user.save()
            logger.info(f"LinkedIn profile synced successfully for {self.user.username}")
            return True
        except Exception as e:
            logger.error(f"Error syncing LinkedIn profile for {self.user.username}: {e}")
            return False

    def create_post(self, blog, domain_url):
        """
        Creates a UGC post on the user's LinkedIn profile containing a link to the blog.
        """
        if not self.user.auto_post_to_linkedin:
            logger.info(f"LinkedIn post skipped: auto_post_to_linkedin is False for {self.user.username}")
            return False
            
        if not blog.is_published:
            logger.info(f"LinkedIn post skipped: blog is not published yet.")
            return False
            
        if not self.token:
            logger.warning(f"LinkedIn post failed: No token found for {self.user.username}")
            return False

        sub = self.token.account.uid
        author_urn = f"urn:li:person:{sub}"

        # Fallback values to prevent API validation errors
        blog_url = f"{domain_url.rstrip('/')}{blog.get_absolute_url()}"
        title = blog.title if blog.title else "New Blog Post"
        
        text = f"Hello World! Check out my new blog post: {title}\n\n{blog_url}"
        
        payload = {
            "author": author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": text
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        try:
            from linkedin_api.clients.restli.client import RestliClient
            restli_client = RestliClient()
            
            response = restli_client.create(
                resource_path="/ugcPosts",
                entity=payload,
                access_token=self.token.token
            )
            
            url = f"https://www.linkedin.com/feed/update/{response.entity_id}/"
            logger.info(f"Successfully posted blog {blog.slug} to LinkedIn for {self.user.username}. Post URL: {url}")
            return url
        except Exception as e:
            logger.error(f"Error posting to LinkedIn for {self.user.username} via RestliClient: {e}")
            return None
