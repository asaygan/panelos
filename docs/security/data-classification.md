# Data Classification

Every column in [schema](../database/schema.md) maps to one of three classes. Handling rules derive from the class.

## Classes

| Class | Definition | Examples |
|---|---|---|
| **Confidential** | Leak causes contractual or safety harm | Schematic PDFs, BOM rows, label `fields_json`, audit `meta_jsonb` |
| **Internal** | Leak is reputationally bad but not safety-critical | Panel metadata, scan events, user names, location names |
| **Public** | Designed to be visible | Marketing copy, status page, OpenAPI schema (in dev/staging only) |

## Per-entity classification

| Entity | Class | Notes |
|---|---|---|
| `companies` (name, slug, logo) | Internal | tenant identity |
| `users` (email, name) | Internal | PII |
| `users.password_hash` | Confidential | argon2 hash; never logged |
| `sessions.token_hash` | Confidential | refresh proof |
| `panels` metadata | Internal | tag, voltage, IP class |
| `pdf_files` content | **Confidential** | schematic — leak = safety risk |
| `revision_files` mapping | Internal | |
| `components` | Confidential | BOM is competitively sensitive |
| `labels.fields_json` | Confidential | mirrors schematic content |
| `scan_events` (ip, geo, ua) | Internal | retention 2 years ([privacy](./privacy.md)) |
| `audit_logs.meta_jsonb` | Confidential | may contain diffs of confidential fields |
| `api_keys.secret_hash` | Confidential | |

## Handling rules

| Class | At rest | In transit | In logs | In analytics |
|---|---|---|---|---|
| Confidential | Encrypted (provider KMS) + RLS | TLS 1.2+ | Never | Aggregates only, never raw |
| Internal | Encrypted at rest | TLS 1.2+ | Hashed identifiers | Tenant-scoped |
| Public | n/a | TLS 1.2+ | Allowed | Allowed |

## Data subject rights (GDPR)

- Right to access: implemented as a tenant export endpoint (Admin-only).
- Right to deletion: panel data is *organizational* (not personal) — survives user deletion. User profile + memberships are deleted; audit log keeps actor as `pseudonym:<sha256(email)>`.
- See [privacy](./privacy.md).

## Schematic-specific protections

- Never embedded in emails.
- Never sent to AI services in MVP ([future-ai](../architecture/future-ai.md) describes opt-in path for future).
- Watermarking via tenant short_name on every render (future).
