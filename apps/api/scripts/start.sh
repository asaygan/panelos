#!/bin/sh
# Container entrypoint: apply pending DB migrations, then launch the API.
# Migrations are idempotent (alembic tracks applied revisions), so this is safe
# on every boot.
#
# NOTE: bind a FIXED port 8000. The Railway HTTP domain
# (panelos-production.up.railway.app) targets port 8000, so the app MUST listen
# there. Do not switch to Railway's injected $PORT — it resolves to a different
# port (e.g. 8080) than the domain target and the proxy returns 502.
set -e

echo "[start] alembic upgrade head…"
alembic upgrade head

echo "[start] launching uvicorn on port 8000…"
exec uvicorn panelos_api.main:app --host 0.0.0.0 --port 8000
