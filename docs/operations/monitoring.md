# Monitoring

PanelOS emits metrics, logs, and traces via **OpenTelemetry** to a single backend (default: **Grafana Cloud**; alternate: **Datadog**).

## Instrumentation

- FastAPI: `opentelemetry-instrumentation-fastapi`.
- SQLAlchemy: `opentelemetry-instrumentation-sqlalchemy`.
- httpx, redis, rq: matching OTel instrumentation packages.
- Web: `@vercel/otel` exports traces from server components and Route Handlers.

All emit to a single collector endpoint configured via `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Dashboards

| Dashboard | Key panels |
|---|---|
| API Health | RPS, p50/p95/p99 latency, error rate, by route |
| Database | active conns, slow queries, replication lag |
| Storage | upload/download rate, error rate, presign latency |
| Revisions | drafts opened, approvals/hr, rejected ratio |
| QR Scans | scans/hr, unique panels scanned, failed resolves |
| Worker | queue depth, job duration, failure rate |
| Tenant cost | bytes stored, scans, audit rows per tenant (top 10) |

## SLIs

| Indicator | Target | Sourced from |
|---|---|---|
| API availability | 99.9% monthly | health probe + 5xx ratio |
| API p95 latency (read) | < 300 ms | OTel spans |
| API p95 latency (upload finalize) | < 800 ms | OTel spans |
| QR resolver p95 | < 200 ms | OTel spans |
| Worker job p95 | < 30 s | OTel spans |

SLOs in [alerting](./alerting.md).

## Health endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | liveness, returns version |
| `GET /api/v1/health/db` | DB query roundtrip |
| `GET /api/v1/health/storage` | storage put+get probe |
| `GET /api/v1/health/redis` | redis ping |

Probed every 15s by Fly health checks.

## What we don’t monitor

- Per-user behavior (privacy).
- Schematic content (data classification: confidential).
