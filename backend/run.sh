#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Change to the directory of this script (the backend folder)
cd "$(dirname "$0")"

echo "======================================"
echo "Starting BlogerMenia Backend Services"
echo "======================================"

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $DJANGO_PID 2>/dev/null || true
    if [ ! -z "$CELERY_WORKER_PID" ]; then
        kill $CELERY_WORKER_PID $CELERY_BEAT_PID 2>/dev/null || true
    fi
    echo "All services stopped."
    exit 0
}

# Trap Ctrl+C and exit signals to run the cleanup function
trap cleanup SIGINT SIGTERM

if [ "$CELERY_ENABLED" = "1" ]; then
    echo "[1/3] Starting Celery Worker..."
    uv run celery -A config worker -l INFO &
    CELERY_WORKER_PID=$!

    echo "[2/3] Starting Celery Beat..."
    uv run celery -A config beat -l INFO &
    CELERY_BEAT_PID=$!
else
    echo "Skipping Celery (run with CELERY_ENABLED=1 to enable). Tasks will run eagerly in Django."
fi

echo "[3/3] Starting Django Development Server..."
uv run python manage.py runserver &
DJANGO_PID=$!

echo "======================================"
echo "All services are running in the background."
echo "Press Ctrl+C to stop them all."
echo "======================================"

# Wait indefinitely until interrupted
wait
