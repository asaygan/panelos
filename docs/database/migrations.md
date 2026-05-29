# Migrations

PanelOS uses **Alembic** for schema migrations. The workflow is *autogenerate then hand-edit* — never trust autogenerate blindly.

## Workflow

### Create a migration

```bash
cd apps/api
uv run alembic revision --autogenerate -m "add components.type column"
```

Open the generated file under `apps/api/src/panelos_api/migrations/versions/`. Review every line:

- Drop spurious enum drops.
- Add explicit `server_default` where needed (autogenerate misses many).
- Hand-write RLS policy DDL for new tenant-scoped tables (Alembic does not infer policies).
- Add data backfills as separate ops with comments.

### Apply

```bash
uv run alembic upgrade head
```

### Rollback (dev only)

```bash
uv run alembic downgrade -1
```

Production rollback is **never** by `downgrade`; see [rollback](../ci-cd/rollback.md). Production rollback is a forward migration that reverses the change.

## Conventions

- One concern per migration.
- Filenames: `{yyyymmddhhmm}_{short_slug}.py`.
- Mandatory docstring at the top with rationale and rollback approach.
- Idempotent guards (`CREATE TABLE IF NOT EXISTS`) only when the table predates Alembic.
- For new tenant-scoped tables, use the helper `enable_rls(op, table_name)` from `panelos_api.migrations.helpers`.

## Long-running data migrations

For backfills on tables with >1M rows:

1. Ship the schema change in one migration with NULL-allowing column.
2. Ship a background job (`tasks/jobs/backfill_*.py`) to populate.
3. Ship a final migration that adds the NOT NULL constraint.

This avoids transactional locks on the deploy hot path. See [runbooks/stuck-migration](../operations/runbooks/stuck-migration.md).

## CI checks

- `alembic check` — fails if model and DB diverge.
- `alembic upgrade head && alembic downgrade base && alembic upgrade head` against an empty Postgres in CI to catch broken pairs.
