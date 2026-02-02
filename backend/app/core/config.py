"""
Application configuration using pydantic-settings.

Why pydantic-settings: Validates environment variables at startup instead of
failing at runtime when a missing key is first accessed. This catches
misconfiguration immediately rather than mid-request.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://quantumiq:quantumiq@db:5432/quantumiq"
    secret_key: str = "dev-secret-key-change-in-production"
    openai_api_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Sync URL for Alembic migrations (asyncpg doesn't work with Alembic)
    @property
    def sync_database_url(self) -> str:
        return self.database_url.replace("+asyncpg", "")

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — only reads .env once per process."""
    return Settings()
