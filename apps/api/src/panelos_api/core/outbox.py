"""Run side effects only after the request's transaction has committed.

Emails and similar effects must not fire for work that gets rolled back, and
must not slow the response down. Services call :func:`after_commit` with an
async callable; ``deps.get_db`` runs the queue once the commit succeeded.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from panelos_api.core.logging import get_logger

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from sqlalchemy.ext.asyncio import AsyncSession

_KEY = "panelos_after_commit"
_log = get_logger("panelos_api.outbox")
_background: set[asyncio.Task[None]] = set()

Effect = "Callable[[], Awaitable[object]]"


def after_commit(session: AsyncSession, effect: Callable[[], Awaitable[object]]) -> None:
    """Queue ``effect`` to run once ``session``'s request transaction commits."""

    session.info.setdefault(_KEY, []).append(effect)


async def _run(effects: list[Callable[[], Awaitable[object]]]) -> None:
    for effect in effects:
        try:
            await effect()
        except Exception as exc:  # a failed side effect must never surface to the user
            _log.warning("after_commit_failed", error=str(exc))


def dispatch(session: AsyncSession, *, wait: bool = False) -> asyncio.Task[None] | None:
    """Fire queued effects in the background (call right after a successful commit)."""

    effects = session.info.pop(_KEY, None)
    if not effects:
        return None
    task = asyncio.create_task(_run(list(effects)))
    _background.add(task)
    task.add_done_callback(_background.discard)
    return task


def discard(session: AsyncSession) -> None:
    """Drop queued effects (the transaction rolled back)."""

    session.info.pop(_KEY, None)


async def drain() -> None:
    """Wait for in-flight effects (tests + graceful shutdown)."""

    while _background:
        await asyncio.gather(*list(_background), return_exceptions=True)
