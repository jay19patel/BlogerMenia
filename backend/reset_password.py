import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bloggermenia.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    user = User.objects.get(username='jaypatel')
    user.set_password('password123')
    user.save()
    print("Password updated successfully for jaypatel")
except User.DoesNotExist:
    print("User jaypatel not found")
