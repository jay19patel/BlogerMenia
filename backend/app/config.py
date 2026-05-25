from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — loaded from environment variables or .env file."""

    # ── Local Ollama ─────────────────────────────────────────────────────────
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.1"

    # ── GCS ───────────────────────────────────────────────────────────────────
    gcs_bucket_name: str = "blogermenia"
    gcs_credentials_path: Path | None = None

    # ── MongoDB ───────────────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "blogermenia"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379"

    # ── Auth (NextAuth JWT validation) ────────────────────────────────────────
    nextauth_secret: str = "fallback_secret_for_development_only"

    # ── App ───────────────────────────────────────────────────────────────────
    debug: bool = False
    environment: str = "development"
    next_public_api_url: str = "http://localhost:8000"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value

    @property
    def is_production(self) -> bool:
        """Return True if the application is running in production mode."""
        return self.environment.lower() == "production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
