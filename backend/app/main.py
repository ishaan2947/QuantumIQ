"""
FastAPI application entry point.

Assembles all route modules, configures CORS, and handles startup/shutdown.

CORS origins are driven by the CORS_ORIGINS env var so the same image can run
locally against the Vite dev server and in production against the deployed
Vercel domain without a code change.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
from app.routes import auth, circuits, simulation, progress, challenges, demo
from app.routes.chat import router as chat_router

logger = logging.getLogger(__name__)
settings = get_settings()

# How long to wait for the database before giving up and serving anyway.
STARTUP_DB_TIMEOUT_SECONDS = 15


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Create database tables on startup if they don't exist.

    A failure here is logged rather than fatal. On a free-tier deployment the
    Postgres instance can expire or be unreachable while the rest of the
    service is perfectly healthy — and the public landing page's demo tutor
    and simulator touch no tables at all. Crashing the process would take down
    the parts that still work in order to report a problem with the parts that
    don't. The auth and circuit routes will surface the failure themselves
    when something actually asks them for data.
    """
    async def create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    try:
        # Bounded, because a connection that hangs rather than being refused
        # would stall startup past Render's health-check window and fail the
        # deploy outright.
        await asyncio.wait_for(create_tables(), timeout=STARTUP_DB_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        logger.error(
            "Database did not respond within %ss at startup. Auth and saved "
            "circuits will fail; the public demo and simulation endpoints are "
            "unaffected.",
            STARTUP_DB_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        logger.error(
            "Database unavailable at startup (%s). Auth and saved circuits will "
            "fail; the public demo and simulation endpoints are unaffected.",
            exc,
        )

    yield
    await engine.dispose()


app = FastAPI(
    title="QuantumIQ",
    description="Agentic AI-powered quantum computing learning platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — explicit origins from config, plus an optional regex that lets Vercel
# preview deployments (which get a fresh subdomain per commit) reach the API
# without editing the env var on every branch.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=(
        r"https://.*\.vercel\.app" if settings.allow_vercel_previews else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all route modules
app.include_router(auth.router)
app.include_router(circuits.router)
app.include_router(simulation.router)
app.include_router(progress.router)
app.include_router(challenges.router)
app.include_router(chat_router)
app.include_router(demo.router)


@app.get("/api/health")
async def health_check():
    """
    Also serves as the warm-up ping the landing page fires on mount, so a
    Render free-tier instance is already spinning up by the time a visitor
    scrolls down to the demo tutor.
    """
    return {"status": "healthy", "service": "QuantumIQ"}
