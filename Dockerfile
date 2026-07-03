# syntax=docker/dockerfile:1
# One image, shared by the web / worker / beat services (they differ only in command).
FROM python:3.13-slim

# uv: fast, reproducible installs straight from uv.lock.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Put the venv OUTSIDE /app so the compose bind-mount (.:/app) can't shadow it
    # with the host's macOS .venv.
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

# System libs some wheels (chromadb, pillow) need at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
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
