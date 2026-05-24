FROM python:3.13-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files first (better Docker layer caching)
COPY pyproject.toml uv.lock* ./

# UV_SYSTEM_PYTHON=1 tells uv to install into the system Python
# instead of creating a venv — correct approach inside Docker
RUN UV_SYSTEM_PYTHON=1 uv sync --no-dev

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
