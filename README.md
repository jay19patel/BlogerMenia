# Blogermenia

Django blog platform with semantic search (Gemini embeddings + ChromaDB), with
embedding work offloaded to **Celery** (broker: **Redis**).

## Run with Docker (development)

```bash
cp .env.dev.example .env.dev   # fill in GOOGLE_API_KEY (https://aistudio.google.com/apikey)
docker compose up --build
```

This starts five containers:

| Service  | What it does                                              | URL                          |
|----------|-------------------------------------------------------------|-------------------------------|
| `redis`  | Celery broker + result backend (persisted volume)          | localhost:6379                |
| `web`    | Django (`migrate` + dev server, auto-reload)                | http://localhost:8000         |
| `worker` | Celery worker — runs the embedding/indexing tasks            | —                              |
| `beat`   | Scheduler — sweeps for missing embeddings every 6h           | —                              |
| `flower` | Task monitoring UI                                          | http://localhost:5555         |

Database is **SQLite** and the Chroma index is a plain folder — both are just
files on your host (bind-mounted), so nothing is lost when containers are
recreated.

### Common commands

```bash
docker compose logs -f worker                                     # watch task execution
docker compose exec web python manage.py reindex_search           # full reindex
docker compose exec web python manage.py reindex_search --missing-only
docker compose restart worker                                     # after task code changes
docker compose down                                                # stop everything
```

## Run in production

```bash
cp .env.prod.example .env.prod   # fill in real secrets — see comments in the file
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d
```

Key differences from dev: **Postgres** instead of SQLite, **gunicorn +
WhiteNoise** instead of the dev server, and **nginx** in front — nginx is the
only container with a port published to the host (80). Django, Postgres and
Redis are only reachable from other containers on the internal network.

## Run locally (without Docker)

Start only Redis in Docker and run Django + Celery on the host:

```bash
docker compose up -d redis
uv sync
cd blogermenia
uv run python manage.py migrate
uv run python manage.py runserver
# in another terminal:
uv run celery -A blogermenia worker --loglevel=info --concurrency=2 -Ofair
# optional scheduler:
uv run celery -A blogermenia beat --loglevel=info
```

With no `CELERY_BROKER_URL` in the environment, settings default to
`redis://localhost:6379`, so the host setup works out of the box (the `redis`
container above still publishes port 6379 to localhost).

## How the async indexing works

1. A blog/playlist/profile is saved → a `post_save` signal fires.
2. On transaction **commit**, an `index_object` task is enqueued to Redis.
3. A Celery worker picks it up, calls Gemini for the embedding, and upserts it
   into ChromaDB — **retrying with backoff** if Gemini is temporarily unavailable.
4. Deletes enqueue `remove_object`; `beat` periodically enqueues `reindex_all`
   for anything that slipped through.

The web request never blocks on Gemini.
