# Blogermenia

Django blog platform with semantic search (Gemini embeddings + ChromaDB), with
embedding work offloaded to **Celery** (broker: **Redis**).

## Run with Docker (development)

```bash
cp .env.dev.example .env.dev   # fill in GOOGLE_API_KEY (https://aistudio.google.com/apikey)
docker compose up --build
```

This starts three containers:

| Service  | What it does                                                        | URL                    |
|----------|----------------------------------------------------------------------|-------------------------|
| `redis`  | Celery broker + result backend (persisted volume, internal-only)    | —                       |
| `web`    | Django (`migrate` + dev server, auto-reload)                         | http://localhost:8000   |
| `worker` | Celery worker **with beat's scheduler embedded (`-B`)** — runs the embedding/indexing tasks and sweeps for missing embeddings every 6h | — |

Database is **SQLite** and the Chroma index is a plain folder — both are just
files on your host (bind-mounted), so nothing is lost when containers are
recreated.

Flower (task monitoring UI, http://localhost:5555) is opt-in since it costs
extra RAM you don't need day-to-day:

```bash
docker compose --profile monitoring up --build
```

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

Key differences from dev: **gunicorn + WhiteNoise** instead of the dev server
(code baked into the image, not bind-mounted), and **nginx** in front — nginx
is the only container with a port published to the host (80). Django and
Redis are only reachable from other containers on the internal network.
SQLite, media and the Chroma index live on named volumes instead of a
bind-mount, so they survive image rebuilds.

Both compose files load the full Django app (langchain + chromadb + the
Gemini client) in every Celery process, so `web` and `worker` each settle
around ~300-350MB at idle — real total for the whole stack is ~650-700MB.
That fits a 1GB VM but with little slack; add a swap file so a momentary
spike gets slowed down instead of OOM-killed:

```bash
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Run locally (without Docker)

Easiest: `uv run python manage.py dev` starts Redis (via brew/redis-server),
worker, beat, Flower and the dev server together — see
`blogermenia/blog/management/commands/dev.py`. Or run each piece by hand:

```bash
brew services start redis   # or: redis-server --daemonize yes
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
`redis://127.0.0.1:6379`, so this works against a plain host-installed Redis.

## How the async indexing works

1. A blog/playlist/profile is saved → a `post_save` signal fires.
2. On transaction **commit**, an `index_object` task is enqueued to Redis.
3. A Celery worker picks it up, calls Gemini for the embedding, and upserts it
   into ChromaDB — **retrying with backoff** if Gemini is temporarily unavailable.
4. Deletes enqueue `remove_object`; `beat` periodically enqueues `reindex_all`
   for anything that slipped through.

The web request never blocks on Gemini.
