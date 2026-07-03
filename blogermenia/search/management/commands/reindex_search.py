from django.core.management.base import BaseCommand

from search.services import SearchService


class Command(BaseCommand):
    help = "Build (or rebuild) semantic search embeddings for blogs, playlists and profiles."

    def add_arguments(self, parser):
        parser.add_argument(
            '--missing-only',
            action='store_true',
            help="Only embed objects that don't have an embedding yet.",
        )

    def handle(self, *args, **options):
        only_missing = options['missing_only']
        self.stdout.write("Indexing search embeddings via Ollama...")
        count = SearchService.reindex_all(only_missing=only_missing)
        self.stdout.write(self.style.SUCCESS(f"Done — {count} object(s) indexed."))
