#!/bin/sh

# Ensure the virtual environment is in the PATH
export PATH="/opt/venv/bin:$PATH"

if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for postgres..."

    while ! nc -z $SQL_HOST $SQL_PORT; do
      sleep 0.1
    done

    echo "PostgreSQL started"
fi

echo "Running Migrations..."
python manage.py migrate

echo "Collecting Static Files..."
python manage.py collectstatic --no-input

exec "$@"
