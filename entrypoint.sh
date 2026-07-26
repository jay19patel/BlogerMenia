#!/bin/sh
set -e

# When starting the web service (default or gunicorn command)
if [ "$1" = "gunicorn" ] || [ -z "$1" ]; then
    echo "==> Running database migrations..."
    python manage.py migrate --noinput

    echo "==> Collecting static files..."
    python manage.py collectstatic --noinput --clear || true

    PORT="${PORT:-8000}"
    echo "==> Starting Gunicorn on 0.0.0.0:$PORT..."
    exec gunicorn blogermenia.wsgi:application --bind "0.0.0.0:$PORT" --workers 1 --threads 2
fi

# Execute any custom command passed to the container (e.g. Celery worker / beat)
exec "$@"
