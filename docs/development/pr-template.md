# Pull Request Template

This content lives at `.github/pull_request_template.md` and is enforced via CI lint (must contain non-empty sections).

```markdown
## Summary

<one to three sentences — what changes and why>

## Changes

- [ ] <bullet, behavioral>
- [ ] <bullet, behavioral>

## Linked

- Issue: #
- ADR (if cross-cutting): docs/adr/<file>
- Design: <prototype path or screenshot>

## How to test

```bash
# steps a reviewer can copy-paste
```

## Risk

- Blast radius: <single feature | API surface | data model>
- Rollback plan: <link to docs/ci-cd/rollback.md or specific steps>

## Checklists

- [ ] Tests added/updated
- [ ] Docs updated (`docs/...`)
- [ ] OpenAPI types regenerated (`pnpm -F web codegen`) if API changed
- [ ] Alembic migration reviewed line-by-line if schema changed
- [ ] RBAC matrix updated if permissions changed
- [ ] No `any`, no `print`, no `console.log` in shipped code
- [ ] Idempotency-Key respected for retried mutations
```

## Notes for authors

- Keep PRs under ~400 lines diff when possible.
- One concern per PR (no refactor + feature).
- If the change touches `services/`, expect 2 reviewers ([code-review](./code-review.md)).
