"""Account API tests: registration validation, and who may see what."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class RegistrationTests(APITestCase):
    url_name = "v1:auth-register"

    def _post(self, **overrides):
        payload = {
            "email": "new@example.com",
            "password1": "a-perfectly-fine-password",
            "password2": "a-perfectly-fine-password",
        }
        payload.update(overrides)
        return self.client.post(reverse(self.url_name), payload, format="json")

    def test_creates_an_account_and_returns_tokens(self):
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_weak_password_is_rejected(self):
        """AUTH_PASSWORD_VALIDATORS were configured but never run here, so the
        API accepted passwords the rest of Django rejects."""
        response = self._post(password1="1234", password2="1234")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password1", response.data)

    def test_mismatched_passwords_are_rejected(self):
        response = self._post(password2="something-else-entirely")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password2", response.data)

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(username="taken", email="new@example.com", password="x-9fj2mfk")
        self.assertEqual(self._post().status_code, status.HTTP_400_BAD_REQUEST)

    def test_never_returns_a_password(self):
        response = self._post()
        self.assertNotIn("password1", response.data)
        self.assertNotIn("password2", response.data)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="loginner", email="Login@Example.com", password="a-perfectly-fine-password"
        )

    def test_login_with_email(self):
        response = self.client.post(
            reverse("v1:token-obtain-pair"),
            {"email": "login@example.com", "password": "a-perfectly-fine-password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn("access", response.data)

    def test_unknown_email_and_wrong_password_look_the_same(self):
        """Neither response should reveal whether an address is registered."""
        unknown = self.client.post(
            reverse("v1:token-obtain-pair"),
            {"email": "nobody@example.com", "password": "a-perfectly-fine-password"},
            format="json",
        )
        wrong = self.client.post(
            reverse("v1:token-obtain-pair"),
            {"email": "login@example.com", "password": "wrong-password-here"},
            format="json",
        )
        self.assertEqual(unknown.status_code, wrong.status_code)
        self.assertEqual(str(unknown.data.get("detail")), str(wrong.data.get("detail")))


class UserExposureTests(APITestCase):
    """The public directory used to hand out email addresses and reading history."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="member", email="member@example.com", password="a-perfectly-fine-password"
        )
        self.viewer = User.objects.create_user(
            username="viewer", email="viewer@example.com", password="a-perfectly-fine-password"
        )

    def test_public_list_hides_private_fields(self):
        row = self.client.get(reverse("v1:user-list")).data["results"][0]
        for private in ("email", "saved_blog_ids", "liked_blog_ids", "auto_post_to_linkedin"):
            self.assertNotIn(private, row)

    def test_public_detail_hides_private_fields(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.get(reverse("v1:user-detail", args=["member"]))
        self.assertNotIn("email", response.data)

    def test_own_detail_shows_private_fields(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("v1:user-detail", args=["member"]))
        self.assertEqual(response.data["email"], "member@example.com")
        self.assertIn("saved_blog_ids", response.data)

    def test_me_endpoint_requires_auth(self):
        self.assertEqual(
            self.client.get(reverse("v1:current-user")).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_cannot_edit_someone_elses_profile(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.patch(
            reverse("v1:user-detail", args=["member"]), {"bio": "hacked"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_email_is_not_editable_through_the_profile(self):
        self.client.force_authenticate(self.user)
        self.client.patch(
            reverse("v1:user-detail", args=["member"]),
            {"email": "attacker@example.com"},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "member@example.com")


class HealthTests(APITestCase):
    def test_health_is_public_and_reports_each_dependency(self):
        response = self.client.get(reverse("v1:health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertIn("database", response.data["checks"])
        self.assertIn("cache", response.data["checks"])
