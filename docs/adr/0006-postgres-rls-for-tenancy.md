# ADR-0006: Postgres RLS as the tenancy backstop

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Multi-tenant data leaks are catastrophic. Application-only enforcement (filter by `company_id` in every query) is one bug away from a leak. We want a second, lower-level enforcement that fails *closed* if the application forgets.

## Decision

Enable Postgres **Row-Level Security (RLS)** on every tenant-scoped table. Each table gets a policy:

```sql
CREATE POLICY tenant_isolation ON {table}
  USING (company_id = current_setting('app.company_id')::uuid);
```

A request-scoped FastAPI dependency runs `SET LOCAL app.company_id = '<uuid>'` on the request’s connection before any query. See [multi-tenancy](../architecture/multi-tenancy.md).

## Consequences

**Positive**
- A forgotten filter no longer leaks data — the query returns zero rows for the wrong tenant.
- Compliance reviewers and pentesters see the policy directly in the DB.
- New tenant-scoped tables get the policy via an Alembic helper, by default.

**Negative**
- RLS adds a small predicate to every query plan; benchmarked as negligible for our access patterns.
- Connection pool re-use needs `SET LOCAL` (transaction-scoped) — long-lived autocommit connections are forbidden in request path.
- Migrations and seed scripts must use a privileged role to load cross-tenant data.

## Alternatives considered

1. **Per-tenant schemas or per-tenant databases** — overhead per tenant grows linearly; impractical for hundreds of tenants on one cluster.
2. **Application-only filtering** — single line of defense; rejected.
