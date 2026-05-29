# PanelOS — MVP Product Requirements

This document describes the scope, success criteria, and explicit non-goals for the first production release of PanelOS. It is the binding contract between product, engineering, and design; anything outside it is tracked in [docs/future/roadmap.md](../future/roadmap.md).

## Problem

Industrial electrical panels (MCCs, distribution boards, control cabinets) are still managed with paper schematics, PDF folders on shared drives, and untracked revisions. Field technicians service the wrong revision. Engineers cannot prove the as-built state. Audits (IEC 61439, ISO 9001) require chain-of-custody that paper cannot give.

## Vision

A single source of truth per panel, addressable by a QR code on the enclosure, that always serves the *active approved* revision to the right person on the right device, with a tamper-evident audit trail.

## MVP Scope

### Personas (full detail in [personas.md](./personas.md))

1. Panel Manufacturer Engineer — uploads revisions, approves changes.
2. Factory Maintenance Lead — owns panel fleet, dispatches technicians.
3. Field Technician — scans QR, reads current schematic, reports issues.
4. Automation Firm Owner — sees fleet health, manages users.

### Core capabilities (must ship)

| ID | Capability | Owner role | Linked story |
|---|---|---|---|
| C-1 | Create / edit / archive a panel record (identity is immutable: tag, serial, qr_token) | Engineer | [user-stories.md#engineer](./user-stories.md#engineer) |
| C-2 | Upload schematic PDFs and attach to a draft revision | Engineer | same |
| C-3 | Submit revision for review, approve, reject (state machine) | Engineer / Admin | [revision-system](../architecture/revision-system.md) |
| C-4 | Auto-generate and print engraved-style and B/W print labels with QR | Engineer | [labels](../architecture/labels.md) |
| C-5 | Public QR scan endpoint serves the active revision to authorized users | All | [qr-system](../architecture/qr-system.md) |
| C-6 | Tamper-evident audit log per tenant | Admin / Owner | [data-model](../architecture/data-model.md) |
| C-7 | RBAC across 5 roles | Owner | [rbac](../security/rbac.md) |
| C-8 | Multi-tenant isolation (companies) | Platform | [multi-tenancy](../architecture/multi-tenancy.md) |
| C-9 | Single command-palette search across panels, revisions, locations | All | — |
| C-10 | Dashboard with KPIs, attention list, recent activity, fleet snapshot, revision queue | All | — |

### Screens (must render)

Login · Dashboard · Panel List (grouping by Line/Area, Location, OEM, Status, Voltage) · Panel Detail with 6 tabs (Overview / Schematics / Components / Revisions / QR / Activity) · Revisions inbox · Schematic Viewer · Labels (3-column config / preview / batch) · Users · Settings (General / Branding / Locations / Integrations / Security).

### Quality bars

- p95 page TTI under 1.5s on a warm cache.
- p95 API response under 300ms for read; under 800ms for upload finalize.
- Availability target 99.9% (see [alerting](../operations/alerting.md)).
- All inputs validated server-side; no client-only authority.

## Out of scope (architecture-ready, not built)

- Zebra/Brother SDK and ZPL printing
- AI assistant / RAG over schematics
- OCR + vision intelligence
- Component-level QR codes
- BOM parsing
- Maintenance logs beyond the audit base
- Offline mobile sync
- Digital twin views

Each is captured in [docs/future/](../future/).

## Success metrics (post-launch, 90 days)

- ≥ 10 paying tenants onboarded.
- ≥ 80% of created panels reach an approved revision.
- ≥ 50% of approved panels have at least one field scan.
- Median time from "draft" to "approved" ≤ 2 business days.

## Constraints

- Monolith-first deployment ([ADR-0001](../adr/0001-monolith-first.md)).
- Pluggable storage from day one ([ADR-0004](../adr/0004-storage-provider-abstraction.md)).
- Postgres RLS as a tenancy backstop ([ADR-0006](../adr/0006-postgres-rls-for-tenancy.md)).
- IEC 61439 nameplate fields preserved on every label.
