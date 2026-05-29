# Local Troubleshooting

Common issues running PanelOS locally. If you hit something not listed, add it.

## Port already in use

```
EADDRINUSE: address already in use :::3000
```

Web tries 3000, API tries 8000.

```bash
lsof -ti :3000 | xargs kill -9
lsof -ti :8000 | xargs kill -9
```

Or change ports via `PORT=3001 pnpm -F web dev` / `--port 8001` for uvicorn.

## Postgres connection refused

```
asyncpg.exceptions.CannotConnectNowError
```

- Compose stack not up: `docker compose -f infra/compose/docker-compose.yml ps`.
- Wrong host: in containers, use `postgres`; from host, `localhost`. Check `DATABASE_URL` accordingly.
- Wrong port: default is `5432` in the container; compose maps to a random host port unless you’ve set `POSTGRES_PORT=5432` in your `.env`.

## `alembic upgrade head` fails

- `pg_dump: error: could not connect` — same as above.
- `target database is not up to date` — run `alembic stamp head` only if you know what you’re doing (use sparingly).
- A migration tries to drop a column that another already removed: `alembic history` and look for branches; resolve to a single head.

## `uv sync` errors

- Wrong Python version: `uv python install 3.12` then `uv sync`.
- Stale `uv.lock`: `uv lock --upgrade` (commit only with reason).
- Network-restricted: `UV_INDEX_URL` for internal mirror.

## pnpm version mismatch

```
ERROR: This project requires pnpm@9
```

- `corepack enable && corepack prepare pnpm@9 --activate`.
- If `corepack` not available: `npm i -g pnpm@9`.

## MinIO credentials don’t work

Default creds in `infra/compose/docker-compose.yml` are `panelos / panelos123`. If you’ve overridden them, sync `.env` with the same values for `S3_ACCESS_KEY` / `S3_SECRET_KEY`.

## Web shows 401 in a loop

- Cookies blocked: ensure browser allows third-party storage on `localhost`.
- `NEXT_PUBLIC_API_URL` doesn’t match where the API runs.
- JWT keys missing: `ls infra/dev-keys/` should show `jwt-priv.pem` and `jwt-pub.pem`. Generate them with `pnpm dev:keys` if absent.

## Type codegen drift in CI

CI runs `pnpm -F web codegen` and fails if the diff is non-empty. Run locally and commit:

```bash
pnpm -F api dev   # in another shell
pnpm -F web codegen
git add packages/types
```

## Docker out of disk

`docker system prune -af --volumes` — careful, drops named volumes including Postgres data.

## PDF upload fails with 400 invalid sha256

You sent the wrong hash. Compute with `shasum -a 256 file.pdf`. The API verifies what you uploaded matches what you declared.
