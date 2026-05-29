# Backend Architecture

The API is a FastAPI app organized in three concentric layers: **routers → services → repositories**. This page describes layer responsibilities, conventions, and where cross-cutting concerns live. Code lives under `apps/api/src/panelos_api/`.

## Layering

```mermaid
flowchart LR
  HTTP[HTTP request] --> R[router]
  R --> D[deps:<br/>current_user,<br/>tenant,<br/>require(perm)]
  D --> S[service]
  S --> Rep[repository]
  Rep --> DB[(Postgres)]
  S --> St[StorageProvider]
  St --> OS[(Object Storage)]
  S --> A[audit_service]
  A --> DB
```

Strict rules:

- **Routers** only do I/O concerns: parse pydantic request, call service, serialize response. No SQL, no business decisions.
- **Services** are the only layer that may:
  - call multiple repositories,
  - perform RBAC checks,
  - emit audit log entries,
  - hold transactions.
- **Repositories** are CRUD-only and always tenant-scoped through the `BaseRepository` (set `company_id` from request context).
- **Models** are SQLAlchemy 2.0 declarative; no business logic on models.

## Module layout

See [the plan section 2](../../README.md) for the file tree; key directories:

```
core/security.py    JWT, argon2
core/rbac.py        Permission enum, require() dep
core/audit.py       AuditLogWriter — chained sha256
core/rate_limit.py  slowapi + redis
core/ids.py         nanoid (22 chars URL-safe), ulid
core/exceptions.py  DomainError -> RFC 7807 problem+json
db/                 SQLAlchemy base, async engine, models
repositories/       per-aggregate data access
services/           business logic
api/v1/routers/     versioned endpoints
api/v1/schemas/     pydantic request / response
storage/            StorageProvider Protocol + impls
labels/             Renderer Protocol + impls
tasks/              optional rq workers
```

## Conventions

### Async everything
SQLAlchemy 2.0 async style; no sync sessions in request path. Background fan-out goes through `rq` ([tasks/](./../../apps/api/src/panelos_api/tasks/) when extracted).

### Pydantic v2
- `model_config = ConfigDict(from_attributes=True)` for ORM → response.
- Strict types (`StrictStr`, `EmailStr`, custom `UlidStr`).
- Schemas live next to the router they serve.

### Errors
Domain errors inherit `DomainError(code, status, title)`; a single FastAPI exception handler emits **RFC 7807** `application/problem+json`. See [api/conventions](../api/conventions.md).

### Naming
- Modules: `snake_case`.
- Classes: `PascalCase`.
- Constants: `SCREAMING_SNAKE`.
- Async fns: verb-led (`approve_revision`, `resolve_qr_token`).
- DB columns: `snake_case`; FKs `<table>_id`.

### IDs
- Primary keys: UUIDv7-ish via `core.ids.new_uuid()`.
- Public tokens (`qr_token`, invitation token): 22-char `nanoid` URL-safe.
- External invoice/refs may differ per integration.

### Migrations
Alembic, autogenerate-first, hand-edit always. See [migrations](../database/migrations.md).

## Observability hooks

- `core.middleware.request_id` reads/generates `X-Request-Id`, propagates to logger, response header, and downstream HTTP clients.
- OpenTelemetry tracing instruments FastAPI, SQLAlchemy, httpx, Redis.
- See [logging](../operations/logging.md), [monitoring](../operations/monitoring.md).

## Testing

- Unit tests target services with repository fakes.
- Integration tests use **testcontainers Postgres** + a real storage stub.
- See [testing](../development/testing.md).
