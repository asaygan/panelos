#!/bin/sh
# Container entrypoint: apply pending DB migrations, then launch the API.
# Migrations are idempotent (alembic tracks applied revisions), so this is safe
# on every boot.
#
# Bind a FIXED port 8000 — App Runner is configured to forward traffic to this
# port (see docs/deployment/aws.md). The Dockerfile EXPOSE matches.
set -e

echo "[start] alembic upgrade head…"
alembic upgrade head

echo "[start] launching uvicorn on port 8000…"
exec uvicorn panelos_api.main:app --host 0.0.0.0 --port 8000
