"""
One-command local dev launcher.

    uv run python blogermenia/manage.py dev

Ensures Redis is running (starts it if not), then boots the Celery worker,
Celery beat scheduler, Flower (task monitoring UI) and the Django dev server together — and shuts
them all down cleanly on Ctrl+C.
"""
import os
import sys
import time
import shutil
import subprocess
from typing import Any, List, Tuple

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    """Management command to launch Redis, Celery Worker, Celery Beat, Flower, and Django dev server."""

    help = "Run Redis + Celery worker + Celery beat + Flower + the Django dev server together."

    def add_arguments(self, parser: Any) -> None:
        """Add command line arguments for address/port and options."""
        parser.add_argument(
            'addrport', nargs='?', default='127.0.0.1:8000',
            help="Django dev server address:port (default 127.0.0.1:8000).",
        )
        parser.add_argument(
            '--flower-port', default='5555',
            help="Port for the Flower monitoring UI (default 5555).",
        )
        parser.add_argument(
            '--no-flower', action='store_true',
            help="Skip Flower (only Redis + worker + beat + runserver).",
        )

    # --- Redis ---------------------------------------------------------------

    def _redis_ok(self) -> bool:
        """Check if Redis connection ping succeeds."""
        try:
            import redis
            redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=2).ping()
            return True
        except Exception:
            return False

    def _ensure_redis(self) -> None:
        """Ensure Redis service is running locally."""
        if self._redis_ok():
            self.stdout.write(self.style.SUCCESS("✓ Redis is already running"))
            return

        self.stdout.write("… Redis not running, starting it")
        if shutil.which('brew'):
            subprocess.run(['brew', 'services', 'start', 'redis'],
                           capture_output=True, text=True)
        elif shutil.which('redis-server'):
            subprocess.Popen(['redis-server', '--daemonize', 'yes'])
        else:
            raise CommandError(
                "Redis is not running and neither `brew` nor `redis-server` was "
                "found. Install Redis (brew install redis) or start it manually."
            )

        for _ in range(10):
            time.sleep(1)
            if self._redis_ok():
                self.stdout.write(self.style.SUCCESS("✓ Redis started"))
                return
        raise CommandError("Redis did not come up in time. Check `brew services list`.")

    # --- Run -----------------------------------------------------------------

    def handle(self, *args: Any, **opts: Any) -> None:
        """Orchestrate subprocesses for Django dev server, Celery worker, Celery beat, and Flower."""
        self._ensure_redis()

        env = os.environ.copy()
        env.setdefault('DJANGO_SETTINGS_MODULE', 'blogermenia.settings')

        manage_py = sys.argv[0]
        celery = [sys.executable, '-m', 'celery', '-A', 'blogermenia']

        specs: List[Tuple[str, List[str]]] = [
            ("worker", celery + ['worker', '-l', 'info', '--concurrency=2']),
            ("beat", celery + ['beat', '-l', 'info']),
        ]
        if not opts['no_flower']:
            specs.append(("flower", celery + ['flower', f"--port={opts['flower_port']}"]))
        specs.append(("django", [sys.executable, manage_py, 'runserver', opts['addrport']]))

        procs: List[Tuple[str, subprocess.Popen[bytes]]] = []
        # start_new_session so Ctrl+C hits only THIS command; we forward the
        # shutdown to the children ourselves (no double-signalling).
        for name, cmd in specs:
            procs.append((name, subprocess.Popen(cmd, env=env, start_new_session=True)))

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Everything is up:"))
        self.stdout.write(f"  • Django    http://{opts['addrport']}")
        self.stdout.write("  • Worker    processing the Celery queue")
        self.stdout.write("  • Beat      scheduling periodic tasks")
        if not opts['no_flower']:
            self.stdout.write(f"  • Flower    http://localhost:{opts['flower_port']}")
        self.stdout.write(self.style.WARNING("\nPress Ctrl+C to stop everything.\n"))

        try:
            while True:
                for name, p in procs:
                    if p.poll() is not None:
                        self.stdout.write(self.style.ERROR(
                            f"\n✗ '{name}' exited (code {p.returncode}); shutting down."
                        ))
                        return
                time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\nStopping…"))
        finally:
            self._shutdown(procs)

    def _shutdown(self, procs: List[Tuple[str, subprocess.Popen[bytes]]]) -> None:
        """Cleanly terminate all spawned subprocesses."""
        for name, p in procs:
            if p.poll() is None:
                p.terminate()
        for name, p in procs:
            try:
                p.wait(timeout=8)
            except subprocess.TimeoutExpired:
                p.kill()
        self.stdout.write(self.style.SUCCESS("✓ All processes stopped"))
