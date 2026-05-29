# PanelOS API

FastAPI backend for PanelOS. Monolith, async SQLAlchemy 2.0, Postgres + Redis, pluggable storage.

## Quickstart

```bash
# from repo root
uv sync

# launch postgres + redis (via root infra/compose)
docker compose -f infra/compose/docker-compose.yml up -d postgres redis minio

# run migrations
cd apps/api
uv run alembic upgrade head

# seed sample data (NorthForge Automation)
uv run python scripts/seed.py --reset

# serve
uv run uvicorn panelos_api.main:app --reload
```

API docs: http://localhost:8000/docs

## Commands

- `uv run ruff check src/` — lint
- `uv run mypy src/panelos_api` — typecheck
- `uv run pytest` — tests
- `uv run alembic revision --autogenerate -m "msg"` — new migration

## Layout

See `/docs/architecture/backend.md` and the build plan section 2.
