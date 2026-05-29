# PanelOS

**The operating system for industrial electrical panels.**

PanelOS digitizes industrial electrical panels with QR-tagged identities, revision-controlled schematics, and mobile field access. Built for electrical engineers, automation firms, panel manufacturers, and maintenance technicians.

---

## What's in this repo

```
apps/
  web/      Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
  api/      FastAPI + SQLAlchemy 2.0 + Alembic + Postgres + Redis
  mobile/   Flutter (skeleton — full build after web MVP)
packages/
  ui/       Design tokens (shared CSS variables)
  types/    Shared TypeScript types (generated from FastAPI OpenAPI)
  config/   eslint / tsconfig / prettier / tailwind preset
docs/       Architecture, ADRs, API, DB, design, deployment, ops, security
infra/      Dockerfiles, docker-compose, future k8s
```

## Quick start

Prerequisites: **Node 20+**, **pnpm 9+**, **Python 3.12+**, **uv**, **Docker**.

```bash
git clone … panelos && cd panelos
pnpm install
uv sync
cp .env.example .env
docker compose -f infra/compose/docker-compose.yml up -d postgres redis minio
cd apps/api && uv run alembic upgrade head && uv run python scripts/seed.py
cd ../..
pnpm dev
```

Web → http://localhost:3000 · API → http://localhost:8000/docs

Default seed login: `m.voss@northforge.io` / `panelos123`.

## Documentation

Start at [docs/README.md](docs/README.md). Highlights:

- [Architecture overview](docs/architecture/overview.md)
- [Setup guide](docs/development/setup.md)
- [API conventions](docs/api/conventions.md)
- [Database schema](docs/database/schema.md)
- [Design system](docs/design/design-system.md)
- [Deployment](docs/deployment/production.md)
- [Security & RBAC](docs/security/rbac.md)
- [Architecture Decision Records](docs/adr/)

## Stack

- **Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind · shadcn/ui · TanStack Query
- **Backend**: FastAPI · SQLAlchemy 2.0 (async) · Alembic · pydantic v2
- **Data**: PostgreSQL 16 · Redis 7
- **Storage**: pluggable provider abstraction (local · S3 · Supabase · Azure)
- **Mobile**: Flutter (planned)
- **CI/CD**: GitHub Actions · Vercel (web) · Fly.io (api)

## License

Proprietary. See [LICENSE](LICENSE).
