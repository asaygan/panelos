# PanelOS Documentation

This is the documentation root for **PanelOS**, a B2B industrial SaaS that digitizes electrical panels through QR codes, revision-controlled schematics, and mobile field access. The docs are written for engineers, ops, security reviewers, and product/design contributors. All docs are in English and kept in sync with the source tree.

## Map

### Product
- [Product Requirements](./product/prd.md)
- [User Stories](./product/user-stories.md)
- [Personas](./product/personas.md)
- [Glossary](./product/glossary.md)

### Architecture
- [Overview & C4](./architecture/overview.md)
- [Backend](./architecture/backend.md)
- [Frontend](./architecture/frontend.md)
- [Data Model](./architecture/data-model.md)
- [Storage Abstraction](./architecture/storage.md)
- [Revision System](./architecture/revision-system.md)
- [QR System](./architecture/qr-system.md)
- [Labels](./architecture/labels.md)
- [Multi-Tenancy](./architecture/multi-tenancy.md)
- [Future AI Seams](./architecture/future-ai.md)
- [Diagram Sources](./architecture/diagrams/)

### Architecture Decision Records
- [0001 Monolith-First](./adr/0001-monolith-first.md)
- [0002 FastAPI over Django](./adr/0002-fastapi-over-django.md)
- [0003 Next.js App Router](./adr/0003-nextjs-app-router.md)
- [0004 Storage Provider Abstraction](./adr/0004-storage-provider-abstraction.md)
- [0005 Revision Immutability](./adr/0005-revision-immutability.md)
- [0006 Postgres RLS for Tenancy](./adr/0006-postgres-rls-for-tenancy.md)
- [0007 Server-Side QR Generation](./adr/0007-server-side-qr-generation.md)
- [0008 Monorepo (pnpm + uv)](./adr/0008-monorepo-pnpm-uv.md)
- [0009 JWT with Rotating Refresh](./adr/0009-jwt-with-rotating-refresh.md)
- [0010 No Printer SDK in MVP](./adr/0010-no-printer-sdk-mvp.md)

### API
- [Conventions](./api/conventions.md)
- [OpenAPI Schema](./api/openapi.yaml)
- [Webhooks](./api/webhooks.md)
- [Examples](./api/examples/)

### Database
- [Schema Reference](./database/schema.md)
- [ERD](./database/erd.svg)
- [Migrations](./database/migrations.md)
- [Seed Data](./database/seed-data.md)
- [Backup & Restore](./database/backup-restore.md)

### Design
- [Design System](./design/design-system.md)
- [Components](./design/components.md)
- [Icons](./design/icons.md)
- [Label Templates](./design/label-templates.md)
- [Handoff Map](./design/handoff.md)
- [Screenshots](./design/screenshots/)

### Development
- [Setup](./development/setup.md)
- [Coding Standards](./development/coding-standards.md)
- [Git Workflow](./development/git-workflow.md)
- [Testing](./development/testing.md)
- [PR Template](./development/pr-template.md)
- [Code Review](./development/code-review.md)
- [Troubleshooting](./development/local-troubleshooting.md)

### Deployment
- [Environments](./deployment/environments.md)
- [Docker](./deployment/docker.md)
- [Production](./deployment/production.md)
- [Secrets](./deployment/secrets.md)
- [Domains & TLS](./deployment/domains-tls.md)
- [Scaling](./deployment/scaling.md)

### Operations
- [Runbooks](./operations/runbooks/)
- [Monitoring](./operations/monitoring.md)
- [Logging](./operations/logging.md)
- [Alerting](./operations/alerting.md)
- [Backup](./operations/backup.md)
- [Disaster Recovery](./operations/disaster-recovery.md)
- [Incident Response](./operations/incident-response.md)

### Security
- [Threat Model](./security/threat-model.md)
- [Data Classification](./security/data-classification.md)
- [RBAC](./security/rbac.md)
- [Secrets Management](./security/secrets-management.md)
- [Dependency Policy](./security/dependency-policy.md)
- [Compliance](./security/compliance.md)
- [Vulnerability Disclosure](./security/vulnerability-disclosure.md)
- [Privacy](./security/privacy.md)

### CI/CD
- [Pipeline](./ci-cd/pipeline.md)
- [Release](./ci-cd/release.md)
- [Rollback](./ci-cd/rollback.md)

### Future / Out-of-Scope
- [Roadmap](./future/roadmap.md)
- [AI RAG Plan](./future/ai-rag-plan.md)
- [OCR / Vision](./future/ocr-vision.md)
- [Offline Sync](./future/offline-sync.md)
- [Component-Level QR](./future/component-level-qr.md)
- [BOM Parsing](./future/bom-parsing.md)
- [Digital Twin](./future/digital-twin.md)

## Conventions

- Source of truth for the build itself is the approved implementation plan at `/Users/ahmetsaygan/.claude/plans/bu-proje-saas-olacak-happy-manatee.md`.
- Diagrams are authored as mermaid; rendered SVGs live next to their `.mmd` sources under `architecture/diagrams/`.
- ADRs follow [MADR](https://adr.github.io/madr/) (Status / Context / Decision / Consequences / Alternatives).
- Cross-links use relative paths so the tree renders correctly on GitHub, internal docs portals, and IDEs.
