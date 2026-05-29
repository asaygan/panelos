#!/usr/bin/env bash
# PanelOS local dev bootstrap.
# One-time: chmod +x scripts/dev-bootstrap.sh
# Run from repo root: ./scripts/dev-bootstrap.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
ok()   { printf "  \033[32mok\033[0m %s\n" "$*"; }
warn() { printf "  \033[33mwarn\033[0m %s\n" "$*"; }
fail() { printf "  \033[31mfail\033[0m %s\n" "$*"; exit 1; }

bold "==> Checking prerequisites"

command -v node >/dev/null   || fail "node is not installed (need >= 20)"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 20 ] || fail "node $NODE_MAJOR detected, need >= 20"
ok "node $(node -v)"

command -v pnpm >/dev/null   || fail "pnpm is not installed (need >= 9). Install via: corepack enable && corepack prepare pnpm@9 --activate"
PNPM_MAJOR=$(pnpm -v | cut -d. -f1)
[ "$PNPM_MAJOR" -ge 9 ] || fail "pnpm $(pnpm -v) detected, need >= 9"
ok "pnpm $(pnpm -v)"

command -v python3 >/dev/null || fail "python3 is not installed (need 3.12)"
PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")')
case "$PY_VER" in
  3.12|3.13) ok "python $PY_VER" ;;
  *) fail "python $PY_VER detected, need 3.12+" ;;
esac

command -v uv >/dev/null     || fail "uv is not installed. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
ok "uv $(uv --version | awk '{print $2}')"

command -v docker >/dev/null || fail "docker is not installed"
docker info >/dev/null 2>&1  || fail "docker daemon is not running"
ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"

bold "==> Preparing .env"
if [ ! -f .env ]; then
  cp .env.example .env
  ok ".env created from .env.example — review and fill in secrets"
else
  ok ".env already exists"
fi

bold "==> Installing JS dependencies (pnpm)"
pnpm install

bold "==> Installing Python dependencies (uv)"
uv sync

bold "==> Starting infrastructure containers"
docker compose -f infra/compose/docker-compose.yml up -d postgres redis minio minio-bootstrap mailhog

bold "==> Waiting for postgres to be healthy"
TRIES=0
until docker compose -f infra/compose/docker-compose.yml exec -T postgres pg_isready -U panelos >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -gt 30 ]; then fail "postgres did not become healthy in 60s"; fi
  sleep 2
done
ok "postgres healthy"

bold "==> Running database migrations"
if [ -d apps/api/alembic ]; then
  (cd apps/api && uv run alembic upgrade head) || warn "alembic upgrade failed (skip if migrations not yet created)"
else
  warn "apps/api/alembic not found yet — skipping migrations"
fi

bold "==> Seeding database"
if [ -f apps/api/scripts/seed.py ]; then
  (cd apps/api && uv run python scripts/seed.py) || warn "seed script failed"
else
  warn "apps/api/scripts/seed.py not found — skipping seed"
fi

bold "==> Done"
cat <<EOF

  Next steps:
    - API:     cd apps/api && uv run uvicorn panelos_api.main:app --reload
    - Web:     pnpm -F web dev
    - Mobile:  cd apps/mobile && flutter run
    - MinIO console:  http://localhost:9001  (minioadmin / minioadmin)
    - Mailhog UI:     http://localhost:8025
    - Postgres:       postgresql://panelos:panelos@localhost:5432/panelos

  Stop infra:  docker compose -f infra/compose/docker-compose.yml down
EOF
