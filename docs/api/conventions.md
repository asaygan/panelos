# API Conventions

The PanelOS HTTP API is JSON-only, versioned under `/api/v1`, and follows the conventions below. All examples assume base URL `https://api.panelos.app` and a valid bearer token unless otherwise noted.

## Versioning

- All endpoints live under `/api/v1`. Breaking changes go to `/v2`.
- Additive changes (new fields, new endpoints) ship under `/v1` and are reflected in the OpenAPI schema regenerated each release.

## Authentication

- Bearer JWT (access token) in `Authorization: Bearer <token>`.
- Web clients use HTTP-only Secure cookies and CSRF double-submit tokens; the same JWT is set as `panelos_at`.
- See [security/rbac](../security/rbac.md) and [ADR-0009](../adr/0009-jwt-with-rotating-refresh.md).

## Tenant selection

- Header `X-PanelOS-Tenant: <company_id>` for API/mobile callers.
- Web uses `panelos_tenant` cookie.
- The active tenant must match a `memberships` row for the authenticated user.

## Errors — RFC 7807

All errors return `application/problem+json` with this shape:

```json
{
  "type": "https://panelos.app/problems/revision-state",
  "title": "Invalid revision transition",
  "status": 409,
  "detail": "Cannot approve a revision in state 'draft'",
  "instance": "/api/v1/revisions/01HV.../approve",
  "code": "REVISION_INVALID_TRANSITION",
  "request_id": "01HV-..."
}
```

Stable: `type`, `code`, `status`. Locale-aware: `title`, `detail`.

## Pagination — cursor-based

List endpoints return:

```json
{
  "items": [...],
  "next_cursor": "eyJ0IjoiMjAyNi0wNS0yOSJ9",
  "prev_cursor": null
}
```

Query: `?limit=50&cursor=...`. Default `limit=25`, max `limit=200`. Cursors are opaque base64 of `{sort_key, last_id}`.

## Filtering & sorting

- Filters via query params (`?status=approved&location_id=...`).
- Sort: `?sort=-created_at` (prefix `-` for desc); only whitelisted fields per endpoint.

## Idempotency

Mutations that may be retried (`POST /labels/batches`, `POST /files/finalize`) accept `Idempotency-Key: <client-uuid>`. The server stores `(company_id, key) -> response` for 24 hours.

## Rate limiting

- Default 600 req/min/IP per tenant; 60 req/min unauth.
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## Request IDs

Every request is tagged with `X-Request-Id` (echoed in response) and logged with that key. See [logging](../operations/logging.md).

## Timestamps

ISO 8601 with offset (`2026-05-29T12:34:56+00:00`). All times stored in UTC; server emits offset for clarity.

## Money / units

- Voltage in volts (int).
- Current in amps (number).
- Sizes in mm for labels; pixels only when relevant to a renderer.

## See also

- [openapi.yaml](./openapi.yaml)
- [webhooks](./webhooks.md)
- [examples](./examples/)
