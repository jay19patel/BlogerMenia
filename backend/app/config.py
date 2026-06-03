from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — loaded from environment variables or .env file."""

    # ── Mistral AI ────────────────────────────────────────────────────────────
    # One API key powers both the chat model (LangGraph blog workflow) and the
    # embeddings (search / suggestions / related blogs).
    mistral_api_key: str | None = None
    # Chat model for the AI blog workflow.
    mistral_chat_model: str = "mistral-large-latest"
    mistral_temperature: float = 0.7
    # Embeddings.
    mistral_embed_model: str = "mistral-embed"
    # Maximum batch size for a single embeddings request (Mistral limit is 512)
    mistral_embed_batch_size: int = 64

    # ── GCS ───────────────────────────────────────────────────────────────────
    gcs_bucket_name: str = "blogermenia"
    gcs_credentials_json: str | None = None
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
