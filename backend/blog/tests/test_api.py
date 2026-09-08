"""API-level tests.

There were none before, which is why every issue these cover reached the audit:
anyone could edit anyone's post, drafts were public, the editor's multipart
payload silently corrupted `sections`, and the category it sent was dropped.
Each test below is one of those.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from blog.models import Blog, Category, Playlist

User = get_user_model()


def make_user(username, **extra):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="s3cure-pass-123", **extra
    )


class AuthorPermissionTests(APITestCase):
    """Only the author may change their own content."""

    def setUp(self):
        self.author = make_user("author")
        self.intruder = make_user("intruder")
        self.blog = Blog.objects.create(title="Mine", content="body", author=self.author)
        self.url = reverse("v1:blog-detail", args=[self.blog.slug])

    def test_anonymous_can_read(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    def test_other_user_cannot_edit(self):
        self.client.force_authenticate(self.intruder)
        response = self.client.patch(self.url, {"title": "Stolen"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.title, "Mine")

    def test_other_user_cannot_delete(self):
        self.client.force_authenticate(self.intruder)
        self.assertEqual(
            self.client.delete(self.url).status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertTrue(Blog.objects.filter(pk=self.blog.pk).exists())

    def test_author_can_edit(self):
        self.client.force_authenticate(self.author)
        response = self.client.patch(self.url, {"title": "Renamed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.title, "Renamed")

    def test_playlist_is_protected_too(self):
        playlist = Playlist.objects.create(title="Mine", author=self.author)
        self.client.force_authenticate(self.intruder)
        response = self.client.delete(reverse("v1:playlist-detail", args=[playlist.slug]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DraftVisibilityTests(APITestCase):
    """An unpublished post is not readable by strangers, slug or no slug."""

    def setUp(self):
        self.author = make_user("writer")
        self.stranger = make_user("stranger")
        self.draft = Blog.objects.create(
            title="Secret Draft", content="unfinished", author=self.author, is_published=False
        )
        self.url = reverse("v1:blog-detail", args=[self.draft.slug])

    def test_anonymous_gets_404(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_other_user_gets_404(self):
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_author_can_read_own_draft(self):
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)

    def test_draft_absent_from_public_list(self):
        Blog.objects.create(title="Live", content="c", author=self.author)
        slugs = [b["slug"] for b in self.client.get(reverse("v1:blog-list")).data["results"]]
        self.assertNotIn(self.draft.slug, slugs)


class BlogWriteContractTests(APITestCase):
    """The payload the editor actually sends, over the transport it sends it on."""

    def setUp(self):
        self.author = make_user("editor")
        self.client.force_authenticate(self.author)

    def test_multipart_json_fields_are_decoded(self):
        """`sections` and `tags` arrive as JSON strings over multipart.

        DRF's JSONField would store them verbatim, leaving a str in a column
        every reader treats as a list.
        """
        response = self.client.post(
            reverse("v1:blog-list"),
            {
                "title": "Structured",
                "sections": '[{"type": "text", "title": "Intro", "content": "Hello"}]',
                "tags": '["Django", "AI"]',
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        blog = Blog.objects.get(slug=response.data["slug"])
        self.assertIsInstance(blog.sections, list)
        self.assertIsInstance(blog.tags, list)
        self.assertEqual(blog.sections[0]["title"], "Intro")
        self.assertEqual(blog.tags, ["Django", "AI"])

    def test_json_body_still_works(self):
        response = self.client.post(
            reverse("v1:blog-list"),
            {"title": "Json", "sections": [{"type": "text", "content": "hi"}], "tags": ["x"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Blog.objects.get(slug=response.data["slug"]).tags, ["x"])

    def test_omitted_booleans_take_the_model_default(self):
        """DRF treats an absent boolean in a multipart body as `False` — the
        unchecked-checkbox convention. A create that simply didn't mention
        `is_published` silently saved a draft."""
        response = self.client.post(
            reverse("v1:blog-list"), {"title": "Published by default"}, format="multipart"
        )
        blog = Blog.objects.get(slug=response.data["slug"])
        self.assertTrue(blog.is_published)
        self.assertFalse(blog.featured)  # model default is False

    def test_explicit_false_is_still_respected(self):
        response = self.client.post(
            reverse("v1:blog-list"),
            {"title": "Explicit draft", "is_published": "false"},
            format="multipart",
        )
        self.assertFalse(Blog.objects.get(slug=response.data["slug"]).is_published)

    def test_category_name_is_honoured(self):
        """The editor sends `category_name`; the old serializer only read
        `category_id`, so every post was saved with a null category."""
        Category.objects.create(name="Engineering")
        response = self.client.post(
            reverse("v1:blog-list"),
            {"title": "Categorised", "category_name": "engineering"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["category"]["name"], "Engineering")

    def test_unknown_category_name_creates_one(self):
        response = self.client.post(
            reverse("v1:blog-list"), {"title": "New topic", "category_name": "Robotics"},
            format="multipart",
        )
        self.assertEqual(response.data["category"]["name"], "Robotics")

    def test_linkedin_state_is_not_client_writable(self):
        response = self.client.post(
            reverse("v1:blog-list"),
            {
                "title": "Nice try",
                "posted_on_linkedin": True,
                "linkedin_post_url": "https://evil.example.com/",
            },
            format="json",
        )
        blog = Blog.objects.get(slug=response.data["slug"])
        self.assertFalse(blog.posted_on_linkedin)
        self.assertFalse(blog.linkedin_post_url)

    def test_svg_in_a_section_is_sanitised(self):
        response = self.client.post(
            reverse("v1:blog-list"),
            {
                "title": "Diagram",
                "sections": [
                    {
                        "type": "excalidraw",
                        "svgData": '<svg onload="alert(1)"><script>alert(2)</script>'
                                   '<rect width="10" height="10"/></svg>',
                    }
                ],
            },
            format="json",
        )
        svg = Blog.objects.get(slug=response.data["slug"]).sections[0]["svgData"]
        self.assertNotIn("onload", svg)
        self.assertNotIn("<script", svg)
        self.assertIn("<rect", svg)  # the drawing itself survives

    def test_legacy_html_body_is_sanitised(self):
        response = self.client.post(
            reverse("v1:blog-list"),
            {"title": "Legacy", "content": '<p>ok</p><script>alert(1)</script>'},
            format="json",
        )
        content = Blog.objects.get(slug=response.data["slug"]).content
        self.assertIn("<p>ok</p>", content)
        self.assertNotIn("<script", content)

    def test_stale_update_is_rejected(self):
        blog = Blog.objects.create(title="Shared", content="v1", author=self.author)
        stale = "2020-01-01T00:00:00Z"
        response = self.client.patch(
            reverse("v1:blog-detail", args=[blog.slug]),
            {"title": "Concurrent", "expected_updated_at": stale},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        blog.refresh_from_db()
        self.assertEqual(blog.title, "Shared")


class BlogListFilterTests(APITestCase):
    """The parameters the frontend has always sent, which used to be dropped."""

    @classmethod
    def setUpTestData(cls):
        cls.author = make_user("filterauthor")
        cls.other = make_user("otherauthor")
        cls.django = Category.objects.create(name="Django")
        cls.ai = Category.objects.create(name="AI")

        cls.a = Blog.objects.create(
            title="Django tips", author=cls.author, category=cls.django,
            tags=["Django", "Web"], featured=True,
        )
        cls.b = Blog.objects.create(
            title="AI notes", author=cls.other, category=cls.ai, tags=["AI"],
        )

    def _slugs(self, **params):
        response = self.client.get(reverse("v1:blog-list"), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {row["slug"] for row in response.data["results"]}

    def test_filter_by_category(self):
        self.assertEqual(self._slugs(category="django"), {self.a.slug})

    def test_filter_by_author(self):
        self.assertEqual(self._slugs(author="otherauthor"), {self.b.slug})

    def test_filter_by_tag(self):
        self.assertEqual(self._slugs(tag="AI"), {self.b.slug})

    def test_filter_by_featured(self):
        self.assertEqual(self._slugs(featured="true"), {self.a.slug})

    def test_exclude_removes_the_current_post(self):
        self.assertNotIn(self.a.slug, self._slugs(exclude=self.a.slug))

    def test_page_size_is_honoured(self):
        response = self.client.get(reverse("v1:blog-list"), {"page_size": 1})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["count"], 2)

    def test_ordering_is_honoured(self):
        response = self.client.get(reverse("v1:blog-list"), {"ordering": "created_at"})
        self.assertEqual(response.data["results"][0]["slug"], self.a.slug)


class PlaylistDetailTests(APITestCase):
    def test_detail_returns_its_posts(self):
        """`get_blogs` used to return [] unconditionally."""
        author = make_user("curator")
        playlist = Playlist.objects.create(title="Best of", author=author)
        blog = Blog.objects.create(title="In the list", author=author)
        playlist.blogs.add(blog)

        response = self.client.get(reverse("v1:playlist-detail", args=[playlist.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([b["slug"] for b in response.data["blogs"]], [blog.slug])


class ContactTests(APITestCase):
    def test_success_returns_a_detail_message(self):
        """The frontend parses `{detail}`; this used to echo the stored row,
        so a successful submission surfaced as an error."""
        response = self.client.post(
            reverse("v1:contact-create"),
            {"name": "A", "email": "a@example.com", "subject": "Hi", "message": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("detail", response.data)


class LinkedInShareTests(APITestCase):
    def setUp(self):
        self.author = make_user("sharer")
        self.blog = Blog.objects.create(title="Share me", author=self.author)
        self.url = reverse("v1:blog-share-linkedin", args=[self.blog.slug])
        self.client.force_authenticate(self.author)

    def test_requires_a_connected_linkedin_account(self):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("accounts.tasks.post_to_linkedin_task.delay")
    def test_dispatches_the_task(self, mock_delay):
        """The endpoint used to flip the flag and return success without
        dispatching anything, so the UI reported a share that never happened."""
        with patch.object(type(self.author), "has_linkedin_oauth", return_value=True):
            response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        mock_delay.assert_called_once_with(self.author.pk, self.blog.pk)
        self.blog.refresh_from_db()
        # Still false: only the task that really posted may set it.
        self.assertFalse(self.blog.posted_on_linkedin)
