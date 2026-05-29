# Scaling

PanelOS is monolith-first ([ADR-0001](../adr/0001-monolith-first.md)). This page describes how we scale vertically and horizontally without splitting yet.

## Tiers

| Tier | Tenants | API machines | Postgres | Notes |
|---|---|---|---|---|
| T0 launch | 1–25 | 2 × small | Neon 0.5 CU | autoscale headroom |
| T1 | 25–250 | autoscale 2–6 | Neon 1–4 CU | add read replica |
| T2 | 250–2,500 | autoscale 4–16, 2 regions | Neon 4–8 CU + 1 replica | split worker fleet |
| T3 | 2,500+ | revisit ADR-0001 | sharded by `company_id` | extract `labels` service |

## Postgres

- **Connection pool:** PgBouncer transaction mode, max 100 server conns per DB; per-app pool 20.
- **Read replicas:** routing via `READ_DATABASE_URL`; only `GET /api/v1/...` endpoints route to replica via a `@read_only` dependency. Writes always go to primary.
- **Vacuum:** Neon autovacuum tuned; large tables (`audit_logs`, `scan_events`) partitioned by month after 50M rows.

## Redis

- **Sharding:** when reads > 50k/s, split into purposes: `rate-limit` and `cache` and `queue` instances. Upstash makes this trivial.

## Object storage

- R2 / S3 are elastic; no scaling action.
- Hot-key risk: `qr/{token}.svg` is cacheable forever; Cloudflare CDN in front.

## API

- Stateless; scale on CPU.
- Background jobs (label batch render, embeddings later) on separate worker fleet.
- File uploads bypass the API via presigned PUT → no big multipart traffic on app servers.

## When to extract services

Triggers:

1. **Label rendering** consuming > 30% of API CPU sustained → extract `labels-service`.
2. **Search** moving beyond Postgres FTS to a dedicated index → extract `search-service`.
3. **Webhook delivery** with > 10k events/min → extract `events-service`.
4. **Mobile API** diverging from web → extract a `mobile-bff`.

Until then: monolith.

## Cost telemetry

Per-tenant cost attribution comes from `scan_events.count` + `pdf_files.byte_size` + `audit_logs.count`. Used by Owner billing dashboards (future).
