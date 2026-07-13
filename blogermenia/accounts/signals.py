import logging
from django.dispatch import receiver
from allauth.account.signals import user_logged_in
from .services import LinkedInService

logger = logging.getLogger(__name__)

@receiver(user_logged_in)
def sync_linkedin_profile_on_login(sender, request, user, **kwargs):
    # Whenever a user logs in, if they have a linkedin account, we sync it.
    # This ensures even returning users get their auto_post_to_linkedin enabled.
    service = LinkedInService(user)
    if service.token:
        service.sync_profile()
