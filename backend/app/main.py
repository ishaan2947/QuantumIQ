"""
FastAPI application entry point.

Assembles all route modules, configures CORS, and handles startup/shutdown.
CORS is configured permissively for development — in production, you'd
restrict origins to your actual frontend domain.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.routes import auth, circuits, simulation, progress, challenges
from app.routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="QuantumIQ",
    description="Agentic AI-powered quantum computing learning platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "QuantumIQ"}
