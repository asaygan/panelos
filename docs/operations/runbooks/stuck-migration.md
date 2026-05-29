# Runbook — Stuck Migration

**Symptom:** `alembic upgrade head` hangs; deploy blocked.

## Diagnose

1. Connect via psql with a privileged role.
2. Check active queries:
   ```sql
   SELECT pid, state, wait_event_type, wait_event, query_start, now() - query_start AS dur, query
   FROM pg_stat_activity
   WHERE state <> 'idle' ORDER BY dur DESC;
   ```
3. Check locks:
   ```sql
   SELECT relation::regclass, mode, granted, pid
   FROM pg_locks WHERE NOT granted;
   ```

## Common causes

| Cause | Action |
|---|---|
| Long-running transaction holding a row lock | Identify, coordinate with author, `pg_terminate_backend(pid)` if safe |
| Lock timeout on `ALTER TABLE` | Retry with `SET lock_timeout = '5s'`; convert to online change |
| Autovacuum holding | Wait, or `pg_cancel_backend(pid)` of autovac (will restart) |
| Cross-table check constraint validation | Drop to `NOT VALID`, validate later |

## Online schema changes

For tables > 1M rows, never block:

- New NOT NULL columns: add as nullable + backfill + add NOT NULL.
- New indexes: `CREATE INDEX CONCURRENTLY`.
- Renames: add new column, dual-write, backfill, swap reads, drop old. Always two deploys.

See [migrations](../../database/migrations.md) for the phased pattern.

## Roll forward, not back

Do not `alembic downgrade` in production. Write a forward migration that reverses the change and ship it.

## Emergency stop

If a migration is causing customer-visible damage:

1. `pg_cancel_backend(pid)` of the migration process.
2. If it left partial state, write a corrective migration immediately.
3. Page DB on-call; sev-2.
