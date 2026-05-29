"""Redis-backed job queue stub.

We don't pull in `rq` yet — this is just a thin push interface so the rest of
the codebase has somewhere to enqueue work.
"""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as redis

from panelos_api.config import get_settings


class JobQueue:
    """Push-only stub backed by a Redis list."""

    def __init__(self, name: str = "default") -> None:
        self.name = name
        self._client: redis.Redis | None = None

    async def _conn(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(get_settings().REDIS_URL, decode_responses=True)
        return self._client

    async def enqueue(self, kind: str, payload: dict[str, Any]) -> None:
        conn = await self._conn()
        await conn.rpush(f"panelos:jobs:{self.name}", json.dumps({"kind": kind, "payload": payload}))
