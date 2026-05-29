# ADR-0001: Monolith-first deployment

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

PanelOS is being built by a small team for a bounded domain (panels, revisions, QR, labels). The volume profile is modest — thousands of panels per tenant, kilobytes of metadata per panel, occasional multi-MB PDF uploads. Microservices add operational, deployment, and observability overhead disproportionate to current needs. The market window favors shipping speed.

## Decision

Ship PanelOS as **one FastAPI deployable, one Next.js deployable, one Postgres, one Redis, one storage bucket**. Keep service boundaries crisp *inside* the codebase (router → service → repository in [backend](../architecture/backend.md)) so a future extraction is a refactor, not a rewrite.

A single `RQ` worker process is allowed for background jobs (label rendering, embeddings later) — it shares the API image and code, just a different CMD.

## Consequences

**Positive**
- Single deploy, single trace context, single set of secrets.
- No network hop between services; latency budget is generous.
- Easier local dev: `docker compose up` and go.
- Fewer moving parts to monitor.

**Negative**
- A buggy job can affect API memory if not run as a separate process. Mitigated by running the worker as a separate container.
- Scaling is coarse — read-replicas before service-splitting (see [scaling](../deployment/scaling.md)).
- Team conventions matter more than enforced boundaries; relies on review discipline.

## Alternatives considered

1. **Microservices from day one** — rejected: cost of distributed tracing, eventual consistency, and shared schema management is not justified for the team size.
2. **Serverless functions** — rejected: cold-starts on PDF rendering are unacceptable; long-lived Postgres connections are awkward; we prefer a stateful process.
3. **Modular monolith with strict packaging boundaries** (e.g., separate Python distributions) — deferred; the convention-based boundary suffices today.

## References
- [architecture/overview](../architecture/overview.md)
- [deployment/production](../deployment/production.md)
