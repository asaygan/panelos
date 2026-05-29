# ADR-0002: FastAPI over Django for the API

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

We need a Python web framework for the API. Top contenders are **FastAPI**, **Django REST Framework**, and **Litestar**. The API is JSON-only; there is no server-rendered template layer (web is Next.js). Async I/O is desirable for PDF uploads, presigning, and OpenTelemetry instrumentation.

## Decision

Use **FastAPI 0.115+** with **SQLAlchemy 2.0 async** and **Pydantic v2**. Migrations via **Alembic**. Background jobs via **rq** on **Redis 7**.

## Consequences

**Positive**
- Native async; aligns with httpx, asyncpg, and Redis async clients.
- Pydantic v2 gives a single schema language for request validation and OpenAPI generation.
- OpenAPI is first-class; `openapi-typescript` to `packages/types` is trivial CI step.
- Smaller surface area than Django; we don’t need the admin or ORM coupling.
- Hot ecosystem around testing (`pytest-asyncio`, `httpx.AsyncClient`).

**Negative**
- No batteries-included admin or auth scaffolding; we own `auth_service.py` outright.
- ORM is "just" SQLAlchemy — repository discipline must be enforced in review.
- Less monolithic guidance than Django; conventions live in our docs ([backend](../architecture/backend.md), [coding-standards](../development/coding-standards.md)).

## Alternatives considered

1. **Django + DRF** — fewer decisions but the admin, contrib auth, and sync ORM clash with our async-first goals.
2. **Litestar** — appealing but smaller ecosystem; we prefer the broader testing and instrumentation libraries around FastAPI.
3. **Node/NestJS** — rejected to keep one language family in the backend and lean into Python’s strength for image and PDF tooling (Pillow, reportlab, segno).
