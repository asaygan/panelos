# Architecture Overview

PanelOS is a **monolith-first** SaaS: one FastAPI deployable, one Next.js deployable, one Postgres, one Redis, pluggable object storage. This page is the entry point for the architecture tree; subsequent pages drill in.

See also: [backend](./backend.md) · [frontend](./frontend.md) · [data-model](./data-model.md) · [storage](./storage.md) · [revision-system](./revision-system.md) · [qr-system](./qr-system.md) · [labels](./labels.md) · [multi-tenancy](./multi-tenancy.md) · [future-ai](./future-ai.md).

## Why monolith-first

Per [ADR-0001](../adr/0001-monolith-first.md): the team is small, the domain is bounded, and the volume profile (thousands of panels per tenant, kilobytes of metadata per panel, occasional PDF uploads) does not warrant microservices. We keep service boundaries crisp inside the codebase (router → service → repository) so we can extract a service later without rewrites.

## C4 — Context

```mermaid
C4Context
    title PanelOS — System Context
    Person(engineer, "Engineer", "Creates panels, uploads revisions")
    Person(tech, "Field Technician", "Scans QR, views schematics")
    Person(owner, "Owner/Admin", "Manages users, billing, settings")

    System(panelos, "PanelOS", "Web + mobile + API")

    System_Ext(storage, "Object Storage", "Local / S3 / Supabase / Azure")
    System_Ext(idp, "IdP (future)", "SAML / OIDC")
    System_Ext(email, "Email gateway", "Transactional email")

    Rel(engineer, panelos, "Uses web")
    Rel(tech, panelos, "Uses mobile, scans QR")
    Rel(owner, panelos, "Administers")
    Rel(panelos, storage, "Stores PDFs, labels, QR images")
    Rel(panelos, idp, "Authenticates (future)")
    Rel(panelos, email, "Sends invites, alerts")
```

## C4 — Containers

```mermaid
flowchart LR
    subgraph Client
      W[Next.js 15 Web<br/>Vercel]
      M[Flutter Mobile<br/>iOS / Android]
    end
    subgraph Backend
      API[FastAPI API<br/>Fly.io]
      W2[RQ Worker<br/>Fly.io]
    end
    subgraph Data
      PG[(Postgres 16<br/>Neon)]
      RD[(Redis 7<br/>Upstash)]
      OS[(Object Storage<br/>Cloudflare R2)]
    end
    W -- HTTPS/JSON --> API
    M -- HTTPS/JSON --> API
    API --> PG
    API --> RD
    API --> OS
    W2 --> PG
    W2 --> RD
    W2 --> OS
```

Mermaid sources live in [./diagrams/](./diagrams/).

## Cross-cutting properties

| Property | Approach | Doc |
|---|---|---|
| Tenancy | `company_id` + Postgres RLS | [multi-tenancy](./multi-tenancy.md) |
| Identity | JWT (RS256) + rotating refresh | [ADR-0009](../adr/0009-jwt-with-rotating-refresh.md) |
| Authorization | `require(Permission.X)` dep + RLS belt | [rbac](../security/rbac.md) |
| Storage | `StorageProvider` Protocol + factory | [storage](./storage.md) |
| Auditing | Hash-chained `audit_logs` | [data-model](./data-model.md) |
| Observability | OpenTelemetry → Grafana Cloud | [monitoring](../operations/monitoring.md) |
| Configuration | `pydantic-settings`, 12-factor env | [setup](../development/setup.md) |

## Repository map

```
apps/web      Next.js 15 App Router
apps/api      FastAPI + SQLAlchemy + Alembic
apps/mobile   Flutter (skeleton)
packages/ui   Design tokens
packages/types  Generated openapi types
infra/        Docker, compose, k8s scaffolds
docs/         You are here
```
