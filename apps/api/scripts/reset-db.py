"""Drop & recreate the public schema (DESTRUCTIVE)."""

from __future__ import annotations

import asyncio

from sqlalchemy import text

from panelos_api.db.session import dispose_engine, get_engine


async def main() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    await dispose_engine()
    print("schema dropped and recreated")


if __name__ == "__main__":
    asyncio.run(main())
