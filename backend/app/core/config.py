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

    # ─── CORS ────────────────────────────────────────────────────────────
    # Comma-separated list. In production this is the Vercel domain; locally
    # it's the Vite dev server. Kept as a string (not list[str]) because
    # pydantic-settings parses list fields as JSON, which is awkward to type
    # into a Render dashboard field.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Allows Vercel preview deployments (pr-123-project.vercel.app) to hit the
    # API without adding every preview URL to cors_origins by hand. Turn this
    # off if you'd rather pin origins exactly.
    allow_vercel_previews: bool = True

    # ─── Public demo ─────────────────────────────────────────────────────
    # The demo tutor is unauthenticated, so every limit here exists to bound
    # what an anonymous visitor can spend of your OpenAI credit.
    demo_enabled: bool = True

    # Deliberately the cheap model — the demo showcases the interaction, not
    # the full agent loop, and gpt-4o-mini is ~25x cheaper than gpt-4o.
    demo_model: str = "gpt-4o-mini"

    demo_session_limit: int = 5          # messages per browser session
    demo_ip_limit: int = 15              # messages per IP per hour
    demo_ip_window_seconds: int = 3600
    demo_ip_burst_limit: int = 6         # messages per IP per minute
    demo_ip_burst_window_seconds: int = 60
    demo_daily_budget: int = 300         # global ceiling, resets at UTC midnight
    demo_max_message_chars: int = 500
    demo_max_output_tokens: int = 400
    demo_history_turns: int = 6          # how much context we send back

    # Set to False only when running with nothing in front of the app, so
    # X-Forwarded-For can't be spoofed to dodge the IP limiter.
    trust_proxy_headers: bool = True

    demo_repo_url: str = "https://github.com/ishaan2947/QuantumIQ"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

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
