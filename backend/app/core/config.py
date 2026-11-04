from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "change-me-before-production"


class Settings(BaseSettings):
    app_name: str = "Mo$chos Pecuária API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://moschos:moschos@localhost:5432/moschos"
    secret_key: str = DEFAULT_SECRET_KEY
    frontend_origins: str = "http://localhost:5173,http://localhost:4173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def require_secret_key_outside_development(self) -> "Settings":
        if self.environment != "development" and self.secret_key == DEFAULT_SECRET_KEY:
            raise ValueError("Defina SECRET_KEY fora do ambiente de desenvolvimento.")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
