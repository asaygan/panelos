# Git Workflow

Trunk-based development with short-lived feature branches. `main` is always deployable.

## Branches

| Pattern | Purpose | Lifetime |
|---|---|---|
| `main` | Always deployable; protected | forever |
| `feat/<scope>-<short-desc>` | New feature | < 5 days |
| `fix/<scope>-<short-desc>` | Bug fix | < 2 days |
| `chore/<short-desc>` | Tooling, deps, docs | as needed |
| `release/<api\|web>-vX.Y.Z` | Release stabilization (rare) | hours |

Squash merge to `main`. Branch protection requires:

- Green CI ([pipeline](../ci-cd/pipeline.md)).
- 1 review (2 for `services/` changes — see [code-review](./code-review.md)).
- Signed commits.
- Up-to-date branch before merge.

## Conventional commits

```
<type>(<scope>)<!>: <subject>

[optional body]

[optional footer(s)]
```

| Type | Use |
|---|---|
| `feat` | New user-visible feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Behavior-preserving cleanup |
| `docs` | Docs-only |
| `test` | Tests only |
| `build` | Build system, deps |
| `ci` | CI config |
| `chore` | Misc; no prod effect |
| `style` | Whitespace, formatting |
| `revert` | Revert of a prior commit |

Examples:

```
feat(panels): add immutability trigger for qr_token
fix(api): handle null active_revision_id in qr resolver
refactor(web)!: replace pages router scaffolding
```

`!` denotes a breaking change; the footer must include `BREAKING CHANGE: <description>`.

## Scopes

Use a single token: `api`, `web`, `mobile`, `db`, `ui`, `types`, `infra`, `docs`, or the feature module (`panels`, `revisions`, `labels`, `auth`, `rbac`, etc.).

## PRs

- Title mirrors the squash-merge commit subject (Conventional).
- Body follows [pr-template](./pr-template.md).
- One concern per PR. Refactor + feature in the same PR is rejected.

## Release tags

`web-vX.Y.Z` and `api-vX.Y.Z`. Separate so we can ship them independently. See [release](../ci-cd/release.md).
