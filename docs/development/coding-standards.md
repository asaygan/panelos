# Coding Standards

Standards binding for both languages. CI enforces what can be enforced; review enforces the rest.

## Python (`apps/api`)

### Tooling

| Tool | Config | Enforces |
|---|---|---|
| `ruff` | `pyproject.toml` `[tool.ruff]` | format, lint, isort, pyupgrade |
| `mypy` | strict mode | static types |
| `pytest` + `pytest-asyncio` | `pyproject.toml` | tests |
| `pydantic v2` | — | runtime validation |

### Rules

- **Async everywhere** in request paths and services. No `requests`, no sync `psycopg2`.
- **Type-hint every public function** (`mypy strict` enforces).
- **No `print`** — use the `structlog` logger (`logger.info("event", key=value)`).
- **No bare `Exception`** — catch domain errors or specific stdlib types.
- **Pydantic v2** for all I/O. Use `Annotated[str, StringConstraints(...)]` rather than ad-hoc validators where possible.
- **SQLAlchemy 2.0 typed select** — no legacy Query API.
- **No raw SQL** in routers/services; if you need raw SQL it goes in `repositories/` with a docstring rationale.
- **Service layer** is the only place that writes audit log + checks RBAC.

### Naming

- Modules / files: `snake_case.py`.
- Classes: `PascalCase`.
- Functions / vars: `snake_case`.
- Constants: `SCREAMING_SNAKE`.
- Test files: `test_*.py`.

### Imports

`ruff` runs `isort` with these groups (in order): future, stdlib, third-party, first-party (`panelos_api`), local. Absolute imports only.

## TypeScript (`apps/web`, `packages/*`)

### Tooling

| Tool | Enforces |
|---|---|
| `tsc` (`strict: true`, `noUncheckedIndexedAccess: true`) | static types |
| `eslint` + `@typescript-eslint` + `eslint-plugin-import` | lint, import order |
| `prettier` | formatting |
| `vitest` | unit tests |
| `playwright` | e2e |

### Rules

- **`strict: true` and `noUncheckedIndexedAccess: true`** — no exceptions.
- **No `any` in shipped code.** `unknown` is fine; narrow with type guards.
- **No default exports** except for Next.js page/layout components (App Router requires them).
- **Server vs client split** is explicit — no implicit `'use client'`.
- **Imports** ordered: builtin → external → internal alias (`@/`) → relative.
- **No prop-driven styling** in primitives; use `cva` variants.

### Naming

- Files: `kebab-case.ts` for utils, `PascalCase.tsx` for components.
- Components: `PascalCase`.
- Hooks: `useFoo`.
- Types: `PascalCase`; type-only imports use `import type`.

## Commit and PR discipline

- Conventional commits ([git-workflow](./git-workflow.md)).
- Tests required for every service. Tests strongly encouraged for every component.
- ADR required for cross-cutting changes (data model, auth, tenancy, public API shape).
