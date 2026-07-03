# Blogermenia

Django blog platform with semantic search (Ollama embeddings + ChromaDB), with
embedding work offloaded to **Celery** (broker: **Redis**).

## Run with Docker

Ollama runs on your **host** (not in a container). Make sure it's up and has the
model pulled:

```bash
ollama serve
ollama pull qwen3-embedding:0.6b
```

Then:

```bash
cp .env.example .env        # already done if .env exists
docker compose up --build
```

This starts four containers:

| Service  | What it does                                          |
|----------|-------------------------------------------------------|
| `redis`  | Celery broker + result backend (persisted volume)     |
| `web`    | Django (`migrate` + dev server) on http://localhost:8000 |
| `worker` | Celery worker — runs the embedding/indexing tasks     |
| `beat`   | Scheduler — sweeps for missing embeddings every 6h    |

### Common commands

```bash
docker compose logs -f worker              # watch task execution
docker compose exec web python manage.py reindex_search           # full reindex
docker compose exec web python manage.py reindex_search --missing-only
docker compose restart worker              # after task code changes
docker compose down                        # stop everything
```

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
`redis://localhost:6379`, so the host setup works out of the box.

## How the async indexing works

1. A blog/playlist/profile is saved → a `post_save` signal fires.
2. On transaction **commit**, an `index_object` task is enqueued to Redis.
3. A Celery worker picks it up, calls Ollama for the embedding, and upserts it
   into ChromaDB — **retrying with backoff** if Ollama is temporarily down.
4. Deletes enqueue `remove_object`; `beat` periodically enqueues `reindex_all`
   for anything that slipped through.

The web request never blocks on Ollama.
