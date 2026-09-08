from .auth_serializers import EmailTokenObtainPairSerializer
from .user_serializers import (
    AuthorSerializer,
    CurrentUserSerializer,
    PublicUserSerializer,
    UserRegistrationSerializer,
)

# Back-compat alias: `UserSerializer` used to be the one-size-fits-all
# serializer. It now means the public one, which is the safe default.
UserSerializer = PublicUserSerializer

__all__ = [
    "AuthorSerializer",
    "CurrentUserSerializer",
    "EmailTokenObtainPairSerializer",
    "PublicUserSerializer",
    "UserRegistrationSerializer",
    "UserSerializer",
]
