from django.core.management.base import BaseCommand

from search.services import SearchService


class Command(BaseCommand):
    help = "Build (or rebuild) semantic search embeddings for blogs, playlists and profiles."

    def add_arguments(self, parser):
        parser.add_argument(
            '--missing-only',
            action='store_true',
            help="Only embed objects with no embedding yet, or whose last attempt failed.",
        )
        parser.add_argument(
            '--prune',
            action='store_true',
            help="Also delete vectors whose backing row no longer exists.",
        )

    def handle(self, *args, **options):
        self.stdout.write("Indexing search embeddings via Gemini...")
        count = SearchService.reindex_all(only_missing=options['missing_only'])
        self.stdout.write(self.style.SUCCESS(f"Done — {count} object(s) indexed."))

        if options['prune']:
            pruned = SearchService.prune_orphans()
            self.stdout.write(self.style.SUCCESS(f"Pruned {pruned} orphaned embedding(s)."))
