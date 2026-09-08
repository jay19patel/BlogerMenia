"""Search tests: what gets embedded, when, and what happens when it fails."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from blog.models import Blog, Category, EmbeddingStatus
from core.tasks import PermanentError, TransientError, classify
from core.text import blog_text
from search import constants as C
from search import tasks as search_tasks

User = get_user_model()


class EmbeddedTextTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="w", password="x-3kfm20fk")

    def test_structured_post_text_includes_its_sections(self):
        """A structured post leaves `content` blank, so the old implementation —
        title + category + content — embedded it by title alone."""
        blog = Blog.objects.create(
            title="Observability",
            author=self.author,
            category=Category.objects.create(name="Ops"),
            subtitle="Traces and metrics",
            introduction="Why it matters.",
            conclusion="Instrument early.",
            sections=[
                {"type": "text", "title": "Spans", "content": "A span is a unit of work."},
                {"type": "bullets", "items": ["latency", "errors"]},
                {"type": "table", "headers": ["Tool"], "rows": [["Jaeger"]]},
                {"type": "flowchart", "steps": [{"title": "Emit", "description": "push spans"}]},
            ],
        )
        text = blog_text(blog)
        for expected in (
            "Observability", "Ops", "Traces and metrics", "Why it matters.",
            "A span is a unit of work.", "latency", "Jaeger", "Emit", "Instrument early.",
        ):
            self.assertIn(expected, text)

    def test_limit_truncates(self):
        blog = Blog.objects.create(title="T", content="x" * 500, author=self.author)
        self.assertEqual(len(blog_text(blog, limit=100)), 100)

    def test_empty_post_yields_no_text_beyond_its_title(self):
        blog = Blog.objects.create(title="Untitled", author=self.author)
        self.assertEqual(blog_text(blog).strip(), "Untitled")


class SignalTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="s", password="x-3kfm20fk")

    @patch("search.tasks.index_object.delay")
    def test_content_save_enqueues_indexing(self, mock_delay):
        with self.captureOnCommitCallbacks(execute=True):
            Blog.objects.create(title="Fresh", content="c", author=self.author)
        mock_delay.assert_called()

    @patch("search.tasks.index_object.delay")
    def test_login_does_not_re_embed_the_profile(self, mock_delay):
        """SIMPLE_JWT writes last_login on every token issue, which fires
        User.post_save. That used to re-embed the whole profile each sign-in."""
        with self.captureOnCommitCallbacks(execute=True):
            self.author.last_login = self.author.date_joined
            self.author.save(update_fields=["last_login"])
        mock_delay.assert_not_called()

    @patch("search.tasks.index_object.delay")
    def test_read_count_bump_does_not_re_embed(self, mock_delay):
        blog = Blog.objects.create(title="Read", content="c", author=self.author)
        mock_delay.reset_mock()
        with self.captureOnCommitCallbacks(execute=True):
            blog.save(update_fields=["read_count"])
        mock_delay.assert_not_called()

    @patch("search.tasks.index_object.delay")
    def test_profile_name_change_does_re_embed(self, mock_delay):
        with self.captureOnCommitCallbacks(execute=True):
            self.author.first_name = "Renamed"
            self.author.save(update_fields=["first_name"])
        mock_delay.assert_called()

    @patch("search.tasks.remove_object.delay")
    def test_delete_removes_the_embedding(self, mock_delay):
        blog = Blog.objects.create(title="Doomed", content="c", author=self.author)
        with self.captureOnCommitCallbacks(execute=True):
            blog.delete()
        mock_delay.assert_called()

    def test_broker_outage_does_not_break_the_save(self):
        """`.delay()` runs inside an on_commit hook — after the row is
        committed — so an unguarded broker error 500s a successful save."""
        with patch(
            "search.tasks.index_object.delay", side_effect=OSError("Connection refused")
        ):
            with self.captureOnCommitCallbacks(execute=True):
                blog = Blog.objects.create(title="Survives", content="c", author=self.author)
        self.assertTrue(Blog.objects.filter(pk=blog.pk).exists())


class IndexingOutcomeTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="i", password="x-3kfm20fk")
        self.blog = Blog.objects.create(title="Indexable", content="body", author=self.author)

    def test_new_post_starts_pending(self):
        self.assertEqual(self.blog.embedding_status, EmbeddingStatus.PENDING)

    @patch("search.services.SearchService.index_object", return_value="deadbeef")
    def test_success_is_recorded(self, mock_index):
        search_tasks.index_object(C.KIND_BLOG, self.blog.pk)
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.embedding_status, EmbeddingStatus.INDEXED)
        self.assertEqual(self.blog.embedding_hash, "deadbeef")
        self.assertIsNotNone(self.blog.embedded_at)
        self.assertEqual(self.blog.embedding_error, "")

    @patch("search.services.SearchService.index_object", side_effect=TransientError("Gemini 503"))
    def test_transient_failure_is_recorded_and_re_raised(self, mock_index):
        with self.assertRaises(TransientError):
            search_tasks.index_object(C.KIND_BLOG, self.blog.pk)
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.embedding_status, EmbeddingStatus.FAILED)
        self.assertIn("Gemini 503", self.blog.embedding_error)

    @patch(
        "search.services.SearchService.index_object",
        side_effect=PermanentError("blog:1 has no text to index"),
    )
    def test_permanent_failure_does_not_retry(self, mock_index):
        # Returns rather than raising, so the retry budget is not spent on
        # something that can never succeed.
        search_tasks.index_object(C.KIND_BLOG, self.blog.pk)
        self.blog.refresh_from_db()
        self.assertEqual(self.blog.embedding_status, EmbeddingStatus.SKIPPED)

    @patch("search.services.SearchService.index_object")
    def test_unchanged_text_is_not_re_embedded(self, mock_index):
        from search.services.search_service import SearchService

        Blog.objects.filter(pk=self.blog.pk).update(
            embedding_hash=SearchService.text_hash(blog_text(self.blog, limit=8000))
        )
        search_tasks.index_object(C.KIND_BLOG, self.blog.pk)
        mock_index.assert_not_called()

    def test_missing_object_is_a_no_op(self):
        search_tasks.index_object(C.KIND_BLOG, 99999)  # must not raise


class ErrorClassificationTests(TestCase):
    def test_network_errors_are_transient(self):
        for message in ("Connection refused", "deadline exceeded", "429 rate limit", "503"):
            self.assertIsInstance(classify(RuntimeError(message)), TransientError, message)

    def test_everything_else_is_permanent(self):
        self.assertIsInstance(classify(ValueError("bad schema")), PermanentError)


class SearchEndpointTests(APITestCase):
    def test_short_query_returns_empty_without_calling_gemini(self):
        with patch("search.services.SearchService.search") as mock_search:
            response = self.client.get(reverse("v1:search_api"), {"q": "a"})
        self.assertEqual(response.data["results"], [])
        mock_search.assert_not_called()

    @patch("search.services.SearchService.search", return_value=[{"kind": "blog"}])
    def test_results_are_cached_between_identical_queries(self, mock_search):
        from django.core.cache import cache

        cache.clear()
        self.client.get(reverse("v1:search_api"), {"q": "django"})
        self.client.get(reverse("v1:search_api"), {"q": "django"})
        # The second call is served from cache — identical queries used to pay
        # for identical (billed) embeddings.
        mock_search.assert_called_once()

    @patch("search.services.SearchService.search", side_effect=RuntimeError("milvus down"))
    def test_backend_failure_reports_503_not_an_empty_result(self, mock_search):
        from django.core.cache import cache

        cache.clear()
        response = self.client.get(reverse("v1:search_api"), {"q": "django"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("detail", response.data)
