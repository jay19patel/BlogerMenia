"""The PDF a post renders to, and the LinkedIn share built on top of it.

These two are tested together because they are one feature: the bytes the
endpoint serves are the bytes the share uploads, and the whole point of that is
that an author can look at the attachment before it goes out.
"""
import json
from unittest.mock import patch

import requests
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from linkedin_api.clients.restli.client import RestliClient
from linkedin_api.clients.restli.response_formatter import (
    ActionResponseFormatter,
    CreateResponseFormatter,
)
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.services import linkedin_share
from blog.models import Blog, Category
from blog.services.pdf_service import render_blog_pdf

User = get_user_model()


def http_response(status_code=200, body=None, headers=None):
    """A `requests.Response` shaped like one LinkedIn would send."""
    response = requests.Response()
    response.status_code = status_code
    response._content = json.dumps(body if body is not None else {}).encode()
    response.url = "https://api.linkedin.com/rest/posts"
    response.headers.update(headers or {})
    return response


def fake_create(status_code=201, urn="urn:li:share:S1"):
    """What `RestliClient.create` returns for a `/posts` call.

    Built through the real formatter so the test asserts against the client's
    actual contract rather than a hand-made stand-in for it.
    """
    headers = {"x-restli-id": urn} if urn else {}
    return CreateResponseFormatter.format_response(
        http_response(status_code, body=None, headers=headers)
    )


def make_user(username, **extra):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="s3cure-pass-123", **extra
    )


SECTIONS = [
    {"type": "text", "title": "Intro", "content": "Plain prose."},
    {"type": "note", "content": "A callout."},
    {"type": "bullets", "title": "Points", "items": ["one", "two"]},
    {"type": "code", "language": "python", "content": "print('hi')\n" * 40},
    {"type": "table", "title": "Grid", "headers": ["A", "B"], "rows": [["1", "2"]]},
    {"type": "links", "links": [{"url": "https://example.com", "text": "Example"}]},
    {"type": "flowchart", "steps": [
        {"title": "Step", "description": "does a thing",
         "branches": [{"title": "Branch", "description": "sometimes"}]},
    ]},
    {"type": "youtube", "videoId": "abc123", "videoTitle": "A video"},
    {"type": "image", "imageUrl": "https://example.com/remote.png", "description": "Remote"},
    {"type": "excalidraw", "caption": "A diagram"},
]


class PdfRenderTests(APITestCase):
    """`render_blog_pdf` must not raise, whatever the sections hold."""

    def setUp(self):
        self.author = make_user("renderer")

    def _blog(self, **extra):
        defaults = {
            "title": "Rendered post", "author": self.author,
            "subtitle": "A subtitle", "introduction": "Opening.", "conclusion": "Closing.",
            "tags": ["Django", "AI"],
        }
        return Blog.objects.create(**{**defaults, **extra})

    def test_renders_every_section_type(self):
        data = render_blog_pdf(self._blog(sections=SECTIONS))
        self.assertTrue(data.startswith(b"%PDF"))

    def test_renders_a_post_with_no_sections(self):
        """A legacy post is a single `content` body and must still render."""
        data = render_blog_pdf(self._blog(content="Just one body of text."))
        self.assertTrue(data.startswith(b"%PDF"))

    def test_survives_malformed_sections(self):
        """Authors and importers both produce shapes the editor never would.

        A ragged table used to be the interesting case: ReportLab raises on a
        grid whose rows disagree about their width, which would have taken the
        LinkedIn share down with it.
        """
        junk = [
            {"type": "table", "headers": ["A", "B"], "rows": [["only one"], ["a", "b", "c"]]},
            {"type": "table", "headers": [], "rows": []},
            {"type": "bullets", "items": None},
            {"type": "code"},
            {"type": "links", "links": [{"description": "no url"}, "not a dict"]},
            {"type": "flowchart", "steps": ["not a dict", {"branches": [None]}]},
            {"type": "unknown-type", "content": "still prose"},
            "not a section at all",
        ]
        data = render_blog_pdf(self._blog(sections=junk))
        self.assertTrue(data.startswith(b"%PDF"))

    def test_author_markup_does_not_break_the_render(self):
        """Section text can hold HTML, and ReportLab reads a few tags of its own.

        Unescaped, a stray tag aborts the whole document rather than one block.
        """
        blog = self._blog(sections=[
            {"type": "text", "content": "<b>bold</b> & <unclosed href='x'> 5 < 6"},
        ])
        self.assertTrue(render_blog_pdf(blog).startswith(b"%PDF"))


class PdfEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.author = make_user("pdfauthor")
        self.stranger = make_user("pdfstranger")
        self.blog = Blog.objects.create(
            title="Published post", author=self.author,
            category=Category.objects.create(name="Backend"),
            sections=SECTIONS,
        )
        self.url = reverse("v1:blog-pdf", args=[self.blog.slug])

    def test_serves_a_pdf(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn(f'filename="{self.blog.slug}.pdf"', response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_serves_a_pdf_to_a_client_that_asks_for_one(self):
        """DRF negotiates a renderer before the handler runs, and the project
        default is JSON only — so `Accept: application/pdf`, which is exactly
        what the frontend's binary client sends, used to 406."""
        response = self.client.get(self.url, headers={"accept": "application/pdf"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_a_browser_accept_header_still_gets_the_document(self):
        response = self.client.get(
            self.url,
            headers={"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_draft_is_not_public(self):
        """The same rule as the detail view: a slug is guessable, drafts are not."""
        draft = Blog.objects.create(title="Draft post", author=self.author, is_published=False)
        url = reverse("v1:blog-pdf", args=[draft.slug])

        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_render_failure_is_503_not_500(self):
        with patch("blog.api.pdf.blog_pdf", side_effect=RuntimeError("boom")):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("detail", response.data)

    def test_second_request_reuses_the_render(self):
        with patch(
            "blog.services.pdf_service.render_blog_pdf", return_value=b"%PDF-fake"
        ) as render:
            self.client.get(self.url)
            self.client.get(self.url)
        render.assert_called_once()

    def test_an_edit_invalidates_the_cached_render(self):
        """The key is the post's `updated_at`, so a save orphans the old bytes."""
        with patch(
            "blog.services.pdf_service.render_blog_pdf", return_value=b"%PDF-fake"
        ) as render:
            self.client.get(self.url)
            self.blog.title = "Edited"
            self.blog.save()
            self.client.get(self.url)
        self.assertEqual(render.call_count, 2)


class CommentaryTests(APITestCase):
    """The text of the share: title, short description, link, hashtags."""

    def setUp(self):
        self.author = make_user("poster")

    def _blog(self, **extra):
        extra.setdefault("title", "How Caching Works")
        return Blog.objects.create(author=self.author, **extra)

    def test_carries_title_description_link_and_hashtags(self):
        blog = self._blog(excerpt="A short teaser.", tags=["Django", "AI"])
        text = linkedin_share.build_commentary(blog, "https://example.com/blogs/x")

        self.assertTrue(text.startswith("How Caching Works"))
        self.assertIn("A short teaser.", text)
        self.assertIn("https://example.com/blogs/x", text)
        self.assertIn("#Django #AI", text)

    def test_falls_back_to_the_subtitle_when_there_is_no_excerpt(self):
        blog = self._blog(subtitle="The subtitle instead.")
        self.assertIn("The subtitle instead.", linkedin_share.build_commentary(blog, "https://x/"))

    def test_description_is_cut_on_a_word_boundary(self):
        blog = self._blog(excerpt="word " * 100)
        text = linkedin_share.build_commentary(blog, "https://x/")
        description = text.split("\n\n")[1]

        self.assertLessEqual(len(description), linkedin_share.DESCRIPTION_LIMIT + 1)
        self.assertTrue(description.endswith("…"))
        self.assertNotIn("wor…", description)

    def test_at_most_five_hashtags(self):
        blog = self._blog(tags=[f"tag{n}" for n in range(9)])
        text = linkedin_share.build_commentary(blog, "https://x/")
        self.assertEqual(text.count("#"), linkedin_share.MAX_HASHTAGS)

    def test_hashtags_hold_only_characters_linkedin_will_link(self):
        """LinkedIn ends a tag at the first character that is not alphanumeric
        or an underscore, so `#Next.js` would link `#Next` and orphan `.js`."""
        self.assertEqual(linkedin_share.hashtag("Next.js"), "#NextJs")
        self.assertEqual(linkedin_share.hashtag("machine learning"), "#MachineLearning")
        self.assertEqual(linkedin_share.hashtag("AI"), "#AI")
        self.assertEqual(linkedin_share.hashtag("PostgreSQL"), "#PostgreSQL")
        self.assertEqual(linkedin_share.hashtag("c#"), "#C")
        self.assertEqual(linkedin_share.hashtag("!!!"), "")

    def test_reserved_characters_are_escaped_but_hashes_are_not(self):
        blog = self._blog(title="Rate limits (and how to survive them)", tags=["API"])
        text = linkedin_share.build_commentary(blog, "https://x/")

        self.assertIn(r"\(and how to survive them\)", text)
        self.assertIn("#API", text)


class DocumentShareTests(APITestCase):
    """`create_post` attaches the PDF, and never loses the share over it."""

    def setUp(self):
        cache.clear()
        self.author = make_user("documentposter")
        self.blog = Blog.objects.create(
            title="Attach me", author=self.author, excerpt="Teaser.", tags=["Django"],
            sections=[{"type": "text", "content": "Body."}],
        )

    def _service(self):
        """A LinkedInService with a stubbed token — nothing here reaches LinkedIn."""
        from accounts.services import LinkedInService

        service = LinkedInService.__new__(LinkedInService)
        service.user = self.author
        service.token = type("Token", (), {
            "token": "fake-access-token",
            "account": type("Account", (), {"uid": "member123"})(),
        })()
        return service

    def test_uploads_the_pdf_and_attaches_it(self):
        service = self._service()
        with patch.object(
            linkedin_share, "upload_document", return_value="urn:li:document:D1"
        ) as upload, patch.object(
            linkedin_share, "create_post", return_value="urn:li:share:S1"
        ) as create:
            url = service.create_post(self.blog)

        self.assertEqual(url, "https://www.linkedin.com/feed/update/urn:li:share:S1/")
        self.assertTrue(upload.call_args.args[3].startswith(b"%PDF"))
        self.assertEqual(create.call_args.kwargs["document_urn"], "urn:li:document:D1")

    def test_a_failed_upload_still_posts(self):
        """The PDF is an enhancement. Losing the whole share over it is worse."""
        service = self._service()
        with patch.object(
            linkedin_share, "upload_document", side_effect=RuntimeError("LinkedIn said no")
        ), patch.object(linkedin_share, "create_post", return_value="urn:li:share:S2") as create:
            url = service.create_post(self.blog)

        self.assertEqual(url, "https://www.linkedin.com/feed/update/urn:li:share:S2/")
        self.assertIsNone(create.call_args.kwargs["document_urn"])

    def test_a_failed_render_still_posts(self):
        service = self._service()
        with patch(
            "blog.services.pdf_service.render_blog_pdf", side_effect=RuntimeError("boom")
        ), patch.object(linkedin_share, "create_post", return_value="urn:li:share:S3") as create:
            service.create_post(self.blog)

        self.assertIsNone(create.call_args.kwargs["document_urn"])

    def test_a_rejected_attachment_is_retried_without_it(self):
        """If LinkedIn accepts the upload but rejects the post that references
        it, the words can still go out on their own."""
        service = self._service()
        with patch.object(
            linkedin_share, "upload_document", return_value="urn:li:document:D4"
        ), patch.object(
            linkedin_share, "create_post",
            side_effect=[RuntimeError("unsupported media"), "urn:li:share:S4"],
        ) as create:
            url = service.create_post(self.blog)

        self.assertEqual(url, "https://www.linkedin.com/feed/update/urn:li:share:S4/")
        self.assertEqual(create.call_count, 2)
        self.assertNotIn("document_urn", create.call_args.kwargs)

    def test_a_rejected_text_post_is_raised_for_the_task_to_retry(self):
        """With no attachment to blame there is nothing to fall back to, and the
        Celery retry policy is what should see the failure."""
        service = self._service()
        with (
            patch.object(linkedin_share, "upload_document", return_value=None),
            patch.object(linkedin_share, "create_post", side_effect=RuntimeError("rate limited")),
            self.assertRaises(RuntimeError),
        ):
            service.create_post(self.blog)

    def test_a_rejected_post_is_not_recorded_as_shared(self):
        """A 4xx from LinkedIn must reach the caller.

        The Rest.li client returns rejections as ordinary response objects, so
        this path used to hand back `None`, get stored as
        `.../feed/update/None/`, and set `posted_on_linkedin` — which then
        blocked every later attempt at the post that never went out.
        """
        service = self._service()
        with (
            patch.object(linkedin_share, "upload_document", return_value=None),
            patch.object(RestliClient, "create", return_value=fake_create(401)),
            self.assertRaises(RuntimeError),
        ):
            service.create_post(self.blog)

    def test_an_unpublished_post_is_never_shared(self):
        self.blog.is_published = False
        self.blog.save()
        with patch.object(linkedin_share, "create_post") as create:
            self.assertIsNone(self._service().create_post(self.blog))
        create.assert_not_called()


class RestliContractTests(APITestCase):
    """The two calls that actually talk to LinkedIn.

    Every test above this mocks `upload_document` and `create_post` wholesale,
    so the shape of a real LinkedIn response was never exercised — which is
    exactly where the share was breaking.
    """

    def _initialize_upload(self, status_code=200):
        """The documented `initializeUpload` reply, formatted by the client."""
        body = {
            "value": {
                "uploadUrl": "https://upload.linkedin.com/slot",
                "document": "urn:li:document:D9",
            }
        }
        return ActionResponseFormatter.format_response(http_response(status_code, body))

    def test_upload_reads_the_reserved_slot(self):
        """`ActionResponse.value` *is* the body's "value" — not a wrapper.

        Unwrapping it twice found nothing, so every upload raised and every
        share fell back to text with no PDF attached.
        """
        with (
            patch.object(RestliClient, "action", return_value=self._initialize_upload()),
            patch.object(requests, "put", return_value=http_response()) as put,
        ):
            urn = linkedin_share.upload_document(
                "token", "urn:li:person:m1", "post.pdf", b"%PDF-1.4"
            )

        self.assertEqual(urn, "urn:li:document:D9")
        self.assertEqual(put.call_args.args[0], "https://upload.linkedin.com/slot")
        self.assertEqual(put.call_args.kwargs["data"], b"%PDF-1.4")

    def test_a_rejected_upload_slot_raises(self):
        with (
            patch.object(RestliClient, "action", return_value=self._initialize_upload(403)),
            self.assertRaises(RuntimeError),
        ):
            linkedin_share.upload_document("token", "urn:li:person:m1", "post.pdf", b"%PDF")

    def test_create_post_returns_the_decoded_urn(self):
        with patch.object(
            RestliClient, "create", return_value=fake_create(urn="urn%3Ali%3Ashare%3A77")
        ):
            urn = linkedin_share.create_post("token", "urn:li:person:m1", "Hello")

        self.assertEqual(urn, "urn:li:share:77")
        self.assertEqual(
            linkedin_share.post_url(urn), "https://www.linkedin.com/feed/update/urn:li:share:77/"
        )

    def test_a_rejected_post_raises_instead_of_returning_no_urn(self):
        with (
            patch.object(RestliClient, "create", return_value=fake_create(422, urn=None)),
            self.assertRaises(RuntimeError) as caught,
        ):
            linkedin_share.create_post("token", "urn:li:person:m1", "Hello")

        self.assertIn("422", str(caught.exception))

    def test_a_throttled_post_is_classified_as_worth_retrying(self):
        """The status code belongs in the message: `classify` reads it to tell a
        rate limit apart from a rejection the retry budget cannot fix."""
        from core.tasks import PermanentError, TransientError, classify

        for status_code, expected in ((429, TransientError), (401, PermanentError)):
            with (
                self.subTest(status=status_code),
                patch.object(RestliClient, "create", return_value=fake_create(status_code, None)),
                self.assertRaises(RuntimeError) as caught,
            ):
                linkedin_share.create_post("token", "urn:li:person:m1", "Hello")
            self.assertIsInstance(classify(caught.exception), expected)

    def test_the_link_reaches_linkedin_unescaped(self):
        """Escaping ran over the whole commentary, backslashes and all — and a
        backslash inside a URL stops LinkedIn auto-linking it."""
        blog = Blog.objects.create(
            title="Post (with parens)", author=make_user("linkposter"), excerpt="Teaser."
        )
        url = "https://example.com/blogs/some_post-(v2)"
        text = linkedin_share.build_commentary(blog, url)

        self.assertIn(url, text)
        self.assertIn(r"\(with parens\)", text)
