# syntax=docker/dockerfile:1
# One image, shared by every service (web / worker / beat / and prod's gunicorn
# web) — they only differ in the command the compose file gives them.
FROM python:3.13-slim

# uv: fast, reproducible installs straight from uv.lock.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Put the venv OUTSIDE /app so the dev bind-mount (.:/app) can't shadow it
    # with the host's own .venv.
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

# System libs needed at runtime:
# - build-essential/libpq-dev: compiling any deps without prebuilt wheels
# - curl: container healthchecks
# - git: `uv sync` builds linkedin-api-client straight from its git repo
# - libpango/libcairo/libgdk-pixbuf/shared-mime-info/fonts: WeasyPrint's PDF rendering
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl git \
        libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
        shared-mime-info fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (cached) — only re-runs when the lockfile changes.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# App code.
COPY . .

# manage.py and the blogermenia package live here.
WORKDIR /app/blogermenia

EXPOSE 8000
