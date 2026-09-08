from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Sign in with an email address instead of a username.

    The email is resolved to a username and SimpleJWT does the rest, which
    keeps `authenticate()` on the path Django's own backends understand. A
    failed lookup and a wrong password produce the same generic error, so this
    endpoint cannot be used to discover which addresses are registered.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.EmailField(write_only=True)
        # The client sends `email`; `username` is filled in below.
        self.fields[self.username_field].required = False

    def validate(self, attrs):
        email = (attrs.pop('email', None) or '').strip()
        if email:
            user = User.objects.filter(email__iexact=email).first()
            # An unknown address deliberately becomes an empty username rather
            # than an early error, so both cases fail the same way.
            attrs[self.username_field] = user.username if user else ''
        return super().validate(attrs)
