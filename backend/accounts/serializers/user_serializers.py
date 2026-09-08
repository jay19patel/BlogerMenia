"""User serializers, in three widths.

One serializer used to answer every question about a user — including the
public directory — and it carried `email`, `saved_blog_ids` and
`liked_blog_ids`. That handed anyone the email address and reading history of
every account on the site. The split below is the fix, and it also removes the
per-author N+1 that the old one caused on every blog listing.

    AuthorSerializer   embedded in blogs and playlists — no extra queries
    PublicUserSerializer   the directory and a profile page — counts annotated
    CurrentUserSerializer  /auth/me/ and your own profile — private fields
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from core.sanitize import clean_text

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    """The author of something. Every field is either on the row itself or
    covered by `prefetch_related('socialaccount_set')`, so nesting this in a
    list costs no queries."""

    avatar_svg = serializers.CharField(read_only=True)
    has_linkedin_oauth = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 'bio',
            'profile_picture', 'linkedin_url', 'avatar_svg', 'has_linkedin_oauth',
        )
        read_only_fields = fields

    def get_has_linkedin_oauth(self, obj) -> bool:
        # Reads the prefetched cache when the queryset asked for it.
        return any(
            account.provider.startswith('linkedin')
            for account in obj.socialaccount_set.all()
        )


class PublicUserSerializer(AuthorSerializer):
    """A user as anyone may see them. No email, no bookmarks, no reading history."""

    blog_count = serializers.SerializerMethodField()
    playlist_count = serializers.SerializerMethodField()

    class Meta(AuthorSerializer.Meta):
        fields = AuthorSerializer.Meta.fields + (
            'about', 'linkedin_connected', 'date_joined', 'blog_count', 'playlist_count',
        )
        read_only_fields = (
            'id', 'username', 'avatar_svg', 'has_linkedin_oauth', 'linkedin_connected',
            'date_joined', 'blog_count', 'playlist_count',
        )

    def get_blog_count(self, obj) -> int:
        annotated = getattr(obj, 'blog_count_annotated', None)
        return annotated if annotated is not None else obj.blogs.filter(is_published=True).count()

    def get_playlist_count(self, obj) -> int:
        annotated = getattr(obj, 'playlist_count_annotated', None)
        return annotated if annotated is not None else obj.playlists.count()

    def validate_bio(self, value):
        return clean_text(value)

    def validate_about(self, value):
        return clean_text(value)


class CurrentUserSerializer(PublicUserSerializer):
    """The signed-in user's own record, and the only serializer that writes."""

    saved_blog_ids = serializers.SerializerMethodField()
    liked_blog_ids = serializers.SerializerMethodField()

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + (
            'email', 'auto_post_to_linkedin', 'saved_blog_ids', 'liked_blog_ids',
        )
        read_only_fields = PublicUserSerializer.Meta.read_only_fields + (
            'saved_blog_ids', 'liked_blog_ids',
            # Changing either is an identity change, not a profile edit. With
            # ACCOUNT_EMAIL_VERIFICATION="none" an unverified email change is an
            # account-takeover primitive, so both need a dedicated, verified
            # flow rather than a field on the profile form.
            'email',
        )

    def get_saved_blog_ids(self, obj) -> list:
        return list(obj.saved_blogs.values_list('id', flat=True))

    def get_liked_blog_ids(self, obj) -> list:
        return list(obj.likes.values_list('blog_id', flat=True))


class UserRegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('email', 'password1', 'password2')
        extra_kwargs = {'email': {'required': True, 'allow_blank': False}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})

        # AUTH_PASSWORD_VALIDATORS were configured but never run here, so the
        # API accepted passwords the rest of Django would reject.
        try:
            validate_password(attrs['password1'], User(email=attrs['email']))
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password1": list(error.messages)})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data['email']
        return User.objects.create_user(
            username=self._available_username(email.split('@')[0]),
            email=email,
            password=validated_data['password1'],
        )

    @staticmethod
    def _available_username(base: str) -> str:
        base = ''.join(ch for ch in base if ch.isalnum() or ch in '._-')[:140] or 'user'
        taken = set(
            User.objects.filter(username__startswith=base).values_list('username', flat=True)
        )
        if base not in taken:
            return base
        counter = 1
        while f"{base}{counter}" in taken:
            counter += 1
        return f"{base}{counter}"
