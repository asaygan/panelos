# Logging

Structured **JSON logs**, single line per event, written to stdout. The hosting platform forwards to the OTel collector and on to Grafana Loki / Datadog Logs.

## Format

```json
{
  "ts": "2026-05-29T12:34:56.789Z",
  "level": "info",
  "logger": "panelos_api.services.revision_service",
  "event": "revision.approve.transitioned",
  "request_id": "01HV...",
  "trace_id": "...",
  "span_id": "...",
  "tenant_id": "cmp_01HV...",
  "user_id": "usr_01HV...",
  "revision_id": "rev_01HV...",
  "previous_active_id": "rev_01HU..."
}
```

Library: `structlog` in API, `pino` in Next.js server runtime.

## Levels

| Level | Use |
|---|---|
| `debug` | dev only; never enabled in prod |
| `info` | every notable lifecycle event (login, approve, upload finalize) |
| `warn` | recovered errors, deprecations, missing optional inputs |
| `error` | failed requests not caused by client (5xx) |
| `critical` | data integrity breach, audit chain mismatch |

## Request ID propagation

- API middleware reads `X-Request-Id`; generates a 26-char ULID if absent.
- All log lines in the request scope include `request_id`.
- The header is echoed back on the response.
- Outbound `httpx` calls forward it.

## PII scrubbing

A `structlog` processor redacts these keys anywhere they appear: `password`, `password_hash`, `token`, `refresh_token`, `secret`, `email` (replaced with sha256 prefix in prod).

Schematic content is never logged.

## Retention

| Stream | Retention |
|---|---|
| App logs | 30 days hot, 1 year cold |
| Access logs | 90 days |
| Audit logs (DB) | 7 years ([privacy](../security/privacy.md)) |
| Scan events (DB) | 2 years |

## Querying

Loki LogQL example:

```logql
{app="panelos-api"} | json | event = "revision.approve.transitioned" | tenant_id = "cmp_01HV..."
```
