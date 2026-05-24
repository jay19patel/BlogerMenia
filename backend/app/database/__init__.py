"""
Motor (async MongoDB) client — shared singleton.
Use get_db() as a FastAPI dependency to get the database handle.
"""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


async def connect_to_mongo() -> None:
    """Open the Motor connection pool. Call once at app startup."""
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    # Verify the connection is reachable
    await _client.admin.command("ping")
    logger.info("Connected to MongoDB at %s", settings.mongodb_uri)


async def close_mongo_connection() -> None:
    """Close the Motor connection pool. Call once at app shutdown."""
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("MongoDB connection closed.")


def get_client() -> AsyncIOMotorClient:
    """Return the shared Motor client (raises if not connected)."""
    if _client is None:
        raise RuntimeError("MongoDB client not initialised — did startup run?")
    return _client


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """FastAPI dependency: yields the application database handle."""
    yield get_client()[settings.mongodb_db]
