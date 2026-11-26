from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Só para desenvolvimento. O HS256 pede uma chave de pelo menos 32 bytes (RFC 7518).
DEFAULT_SECRET_KEY = "dev-only-change-me-before-production-moschos"
SECRET_KEY_MIN_BYTES = 32


class Settings(BaseSettings):
    app_name: str = "Mo$chos Pecuária API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://moschos:moschos@localhost:5432/moschos"
    secret_key: str = DEFAULT_SECRET_KEY
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    frontend_origins: str = "http://localhost:5173,http://localhost:4173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def require_secret_key_outside_development(self) -> "Settings":
        if self.environment != "development":
            if self.secret_key == DEFAULT_SECRET_KEY:
                raise ValueError("Defina SECRET_KEY fora do ambiente de desenvolvimento.")
            if len(self.secret_key.encode()) < SECRET_KEY_MIN_BYTES:
                raise ValueError("SECRET_KEY precisa ter pelo menos 32 bytes.")
        return self

    @property
    def cookie_secure(self) -> bool:
        """Cookie só por HTTPS fora do desenvolvimento (ADR 0001)."""
        return self.environment != "development"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
