import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bloggermenia.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("Registered Users:")
for user in User.objects.all():
    print(f"Username: {user.username}, Email: {user.email}, Is Active: {user.is_active}")
