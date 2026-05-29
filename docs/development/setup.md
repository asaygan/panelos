# Local Setup

This page bootstraps a developer from an empty machine to a running PanelOS stack in under 15 minutes.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node | 20.x LTS | `fnm install 20` or `nvm install 20` |
| pnpm | 9.x | `corepack enable && corepack prepare pnpm@9 --activate` |
| Python | 3.12 | `uv python install 3.12` |
| uv | 0.4+ | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker | 24+ | Docker Desktop or Colima |
| Flutter | 3.22+ (optional, mobile only) | `fvm install 3.22.0` |

## Clone & install

```bash
git clone https://github.com/<org>/panelos.git
cd panelos
pnpm install        # workspaces: web, ui, types, config
uv sync             # workspace member: apps/api
```

## Environment

Copy the example and edit:

```bash
cp .env.example .env
```

Required vars (full list in `.env.example`):

| Var | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://panelos:panelos@localhost:5432/panelos` | Compose default |
| `REDIS_URL` | `redis://localhost:6379/0` | |
| `STORAGE_PROVIDER` | `local` | or `s3` / `supabase` / `azure` |
| `STORAGE_LOCAL_PATH` | `./apps/api/.storage` | only when local |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO in compose |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `panelos / panelos123` | MinIO default |
| `JWT_PRIVATE_KEY_PATH` | `./infra/dev-keys/jwt-priv.pem` | RS256 dev key |
| `JWT_PUBLIC_KEY_PATH` | `./infra/dev-keys/jwt-pub.pem` | |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | |

## Bring up dependencies

```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres redis minio mailhog
```

Wait for health (`docker compose ps`).

## Migrate + seed

```bash
cd apps/api
uv run alembic upgrade head
uv run python scripts/seed.py --reset
```

This loads NorthForge + 12 panels + 5 revisions ([seed-data](../database/seed-data.md)).

## Run the apps

In separate terminals:

```bash
# API
cd apps/api
uv run uvicorn panelos_api.main:app --reload --port 8000

# Web
pnpm -F web dev
```

Open http://localhost:3000 and sign in as `m.voss@northforge.io / panelos123`.

## Type codegen

After API schema changes:

```bash
pnpm -F web codegen
# writes packages/types/openapi.d.ts from http://localhost:8000/openapi.json
```

CI fails if the committed types drift from the running API.

## Run tests

```bash
# API
cd apps/api && uv run pytest

# Web
pnpm -F web test           # vitest unit
pnpm -F web test:e2e       # Playwright (needs running dev server)
```

## Troubleshooting

See [local-troubleshooting](./local-troubleshooting.md).
