# Contributing to PanelOS

Thank you for contributing. This guide gets you productive fast and keeps the codebase coherent across web, API, and mobile.

## Ground rules

1. Read [docs/development/setup.md](docs/development/setup.md) before your first PR.
2. Follow [docs/development/coding-standards.md](docs/development/coding-standards.md). It is enforced by CI.
3. Any cross-cutting architectural change needs an ADR — see [docs/adr/](docs/adr/).
4. Every PR must be green on `ci.yml` (lint + typecheck + tests + build + openapi drift).
5. Conventional Commits — see [docs/development/git-workflow.md](docs/development/git-workflow.md).

## Workflow

```bash
git checkout -b feat/panel-grouping
# … work …
pnpm lint && pnpm typecheck && pnpm test
cd apps/api && uv run pytest && uv run ruff check . && uv run mypy .
git commit -m "feat(web): collapsible group rows on panel list"
git push -u origin feat/panel-grouping
gh pr create
```

## Code review

- One reviewer required. Two for changes touching `apps/api/src/panelos_api/services/` or `migrations/`.
- Squash-merge to `main`. Branch deletes after merge.

## Reporting bugs

Use the issue template. Include reproduction steps, environment, and what you expected vs. what happened. For security issues see [SECURITY.md](SECURITY.md).
