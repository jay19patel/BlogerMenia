from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ollama_model: str = "qwen3.5:latest"
    ollama_base_url: str = "http://localhost:11434"
    ollama_timeout: float = 60.0
    ollama_num_predict: int = 1024
    ollama_num_ctx: int = 4096

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
