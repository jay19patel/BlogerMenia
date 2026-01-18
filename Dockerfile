# Stage 1: Builder
FROM python:3.11-slim-bookworm AS builder

# Install system dependencies for building (if any needed for python packages)
# RUN apt-get update && apt-get install -y build-essential

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set environment variables for uv
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT="/opt/venv"

# Create virtual environment and install dependencies
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project


# Stage 2: Final Runtime
FROM python:3.11-slim-bookworm

# Set work directory
WORKDIR /usr/src/app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Add backend-specific environment path
ENV PATH="/opt/venv/bin:$PATH"

# Install runtime system dependencies
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy entrypoint
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//g' /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy application code
COPY . .

# Run entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
