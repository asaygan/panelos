#!/bin/sh
# Container entrypoint: apply pending DB migrations, then launch the API.
# Migrations are idempotent (alembic tracks applied revisions), so this is safe
# on every boot. Honors Railway's injected $PORT.
set -e

echo "[start] alembic upgrade head…"
alembic upgrade head

echo "[start] launching uvicorn on port ${PORT:-8000}…"
exec uvicorn panelos_api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
