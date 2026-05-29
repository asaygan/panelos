# Code Review

What reviewers look for, in roughly the order they should look for it. Reviews are blocking but should be fast — most PRs reviewed within 4 hours.

## Two-reviewer rule

| Change | Reviewers |
|---|---|
| `apps/api/src/panelos_api/services/**` | 2 |
| `apps/api/src/panelos_api/db/models/**` | 2 |
| Alembic migrations | 2 |
| `core/security.py`, `core/rbac.py`, `core/audit.py` | 2 |
| Anything else | 1 |

Security-sensitive changes (auth, RBAC, RLS) require one reviewer from the security-eng group.

## Checklist

### Correctness
- Does it do what the PR says?
- Does the test prove it?
- Are edge cases (empty list, NULL FK, concurrent transition) covered?

### Safety
- Are RBAC checks at the **service** layer?
- Is the query tenant-scoped (via `BaseRepository`)?
- Are inputs validated server-side (pydantic), not just client-side?
- Are secrets, tokens, or PII anywhere in logs?

### Migrations
- Reviewed line-by-line.
- Idempotent guards on legacy tables.
- RLS policy added for new tenant-scoped tables.
- No table rewrites on large tables without a phased plan (see [migrations](../database/migrations.md)).

### API contract
- OpenAPI regenerated; types committed.
- New endpoints documented in [conventions](../api/conventions.md) style (errors as RFC 7807, pagination).
- Webhook events added to [webhooks](../api/webhooks.md) if applicable.

### Frontend
- Server vs client split intentional.
- No `any`.
- Uses primitives, not raw HTML; uses `<Icon>` not direct lucide imports.
- Density / theme tokens, never hardcoded hex.

### Docs
- New behavior covered in the right doc page.
- ADR for cross-cutting changes.

## Conduct

- Comment on the code, not the person.
- Distinguish blocking (`request changes`) from preference (`nit:`).
- Suggest, don’t demand; trust the author’s judgment unless something is wrong.
