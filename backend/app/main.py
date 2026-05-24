"""
FastAPI application factory with async lifespan.
Connects MongoDB and Redis at startup; closes them at shutdown.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import blogs as blog_router
from app.routers import media as media_router
from app.routers import playlists as playlists_router
from app.database.mongo import connect_to_mongo, close_mongo_connection
from app.database.redis import connect_to_redis, close_redis_connection
from app.routes import router as chat_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect to MongoDB + Redis. Shutdown: close both."""
    logger.info("Starting up Blogermenia backend…")
    await connect_to_mongo()
    await connect_to_redis()
    yield
    logger.info("Shutting down Blogermenia backend…")
    await close_mongo_connection()
    await close_redis_connection()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Blogermenia API",
        description="AI blog generation (local Ollama + LangGraph) + full blog CRUD with MongoDB and Redis",
        version="3.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],          # Tighten in production via env var
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Blog CRUD + categories + stats ─────────────────────────────────────
    app.include_router(blog_router.router)
    app.include_router(playlists_router.router)
    app.include_router(media_router.router)

    # ── Local media uploads static hosting (Dev mode only) ────────────────
    if not settings.is_production:
        os.makedirs("uploads", exist_ok=True)
        app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    # ── AI chat (existing LangGraph workflow) ───────────────────────────────
    app.include_router(chat_router)

    return app


app = create_app()
