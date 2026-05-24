from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — loaded from environment variables or .env file."""

    # ── Google Gemini ─────────────────────────────────────────────────────────
    google_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # ── GCS ───────────────────────────────────────────────────────────────────
    gcs_bucket_name: str = "blogermenia"
    use_gcs: bool = False

    # ── MongoDB ───────────────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "blogermenia"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379"

    # ── Auth (NextAuth JWT validation) ────────────────────────────────────────
    nextauth_secret: str = "fallback_secret_for_development_only"

    # ── App ───────────────────────────────────────────────────────────────────
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
