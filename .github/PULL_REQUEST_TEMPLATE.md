<!-- PR title must follow Conventional Commits, e.g. `feat(web): add tenant switcher` -->

## Summary
<!-- 1-3 sentences. What and why. -->

## Linked issue
Closes #

## Screenshots / recordings
<!-- For UI changes. Delete if N/A. -->

## How to test
1.
2.

## Checklist
- [ ] Types pass (`pnpm -F web typecheck`, `uv run mypy …`)
- [ ] Lints pass (`pnpm -F web lint`, `uv run ruff check`)
- [ ] Tests added / updated and passing
- [ ] Docs updated (README, ADR, OpenAPI/codegen regenerated)
- [ ] No secrets, credentials, or PII committed
- [ ] If architectural: ADR added under `docs/adr/`
- [ ] If schema change: Alembic migration + tested downgrade path
- [ ] If breaking: changeset added (`pnpm changeset`)
