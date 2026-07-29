#!/bin/sh
set -e

# Default command (or explicit "gunicorn"): run the web service.
if [ "$1" = "gunicorn" ] || [ -z "$1" ]; then
    echo "==> Running database migrations..."
    python manage.py migrate --noinput

    echo "==> Collecting static files..."
    python manage.py collectstatic --noinput --clear || true

    PORT="${PORT:-8000}"
    echo "==> Starting Gunicorn on 0.0.0.0:$PORT..."
    exec gunicorn blogermenia.wsgi:application \
        --bind "0.0.0.0:$PORT" \
        --workers "${GUNICORN_WORKERS:-1}" \
        --threads "${GUNICORN_THREADS:-2}" \
        --timeout 60
fi

# Anything else (celery worker / beat / a one-off manage.py command) runs as-is.
exec "$@"
