# Runbook — Database Failover

**Symptom:** Postgres primary unreachable; replicas may be lagging or read-only.
**Severity:** Sev-1.

## Provider-managed (Neon)

Neon handles compute failover automatically; storage is decoupled.

1. Verify on https://neon.tech/status — incident shown there?
2. Restart the API to refresh connection pool: `fly machine restart -a panelos-api`.
3. Confirm `/api/v1/health/db` returns 200.
4. Investigate replication lag: `SELECT now() - pg_last_xact_replay_timestamp();` on the replica.

## Self-hosted (AWS RDS / customer infra)

1. Promote a standby:
   ```bash
   aws rds promote-read-replica --db-instance-identifier panelos-replica-1
   ```
2. Update DNS or `DATABASE_URL` secret to new endpoint.
3. Redeploy API: secret change triggers a rolling restart.
4. Re-add a new replica from the new primary.

## Application behavior

The API uses `asyncpg` with connection retries (3, exponential to 5s). Brief failovers are tolerated by clients with the standard 401/refresh + retry pattern.

## Data integrity post-failover

1. Run audit-chain verifier:
   ```bash
   uv run python -m panelos_api.tools.verify_audit_chain --since "1 hour ago"
   ```
2. Compare `panels.active_revision_id` rows against latest WAL — none should be NULL where a revision is approved.

## Communication

Sev-1 protocol — see [incident-response](../incident-response.md).
