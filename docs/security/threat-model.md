# Threat Model

STRIDE per component. Reviewed quarterly and on major architecture changes.

Components in scope: **Web (Next.js)**, **API (FastAPI)**, **Storage**, **DB (Postgres)**, **Mobile (Flutter)**.

## Web

| Threat | Vector | Mitigation |
|---|---|---|
| **S**poofing | Stolen access cookie | HTTP-only + Secure + SameSite=Lax; short TTL (15m); rotate refresh |
| **T**ampering | XSS injects scripts | React escaping by default; CSP `default-src 'self'`; no `dangerouslySetInnerHTML` on user content |
| **R**epudiation | User denies action | Server logs `actor_id` on every state change; audit log for cross-checks |
| **I**nfo disclosure | Source maps reveal API surface | Strip in prod build; OpenAPI gated to authed users in prod |
| **D**oS | Bot floods login | rate-limit by IP + email; reCAPTCHA on N failures |
| **E**oP | CSRF on mutations | Same-site cookies + double-submit token for non-GET |

## API

| Threat | Vector | Mitigation |
|---|---|---|
| S | Forged JWT | RS256 with key rotation; jwks `kid` discipline |
| T | Mass-assignment on pydantic models | Explicit `model_config = ConfigDict(extra='forbid')` |
| R | Service action without actor | Audit writer requires actor_id; system actor is a distinct UUID |
| I | Cross-tenant query | Service tenant check + RLS belt; mypy gates raw selects |
| D | Slowloris / large bodies | uvicorn `--limit-max-requests`, body size cap 25 MB |
| E | Privilege escalation via role parameter | `require(Permission)` deps; role never trusted from client |

## Storage

| Threat | Vector | Mitigation |
|---|---|---|
| S | Stolen presigned URL | TTL ≤ 600s; scope to key; HTTPS only |
| T | Tampered file content | SHA-256 verified server-side on finalize |
| R | Anonymous delete | Bucket policy denies anonymous; delete needs service role |
| I | Listing one tenant’s bucket prefix | No `s3:ListBucket` granted to runtime role; per-key access only |
| D | Storage flood | Per-tenant upload quota; rate limit on `/files/presign` |
| E | Cross-tenant read | Keys carry `companies/{company_id}/` prefix; signed URLs scoped |

## Database

| Threat | Vector | Mitigation |
|---|---|---|
| S | App connects as superuser | Dedicated app role with minimum privileges; only migrations run as superuser |
| T | SQL injection | SQLAlchemy bind params only; no string concat |
| R | DBA mutations untraced | Postgres `log_statement = 'ddl'`; ops actions go through reviewed migrations |
| I | Cross-tenant SELECT | RLS policies enforced; reviewed in migration |
| D | Connection exhaustion | PgBouncer; per-app pool cap |
| E | Schema modification by app | App role has no `CREATE` on public schema |

## Mobile

| Threat | Vector | Mitigation |
|---|---|---|
| S | Stolen refresh token from device | Secure enclave (iOS Keychain / Android Keystore) storage |
| T | Modified APK | Future: app attestation (Play Integrity, App Attest) |
| R | Offline action repudiation | Sync queue carries client-issued ULID + signed timestamp |
| I | Cached schematics on lost device | Encrypted-at-rest cache; remote wipe via session revocation |
| D | Camera scan spam | Rate-limit on scan endpoint per device |
| E | Deep link phishing | Universal links with verified domain association |

## Cross-cutting

- All secrets in Doppler / Vault — [secrets-management](./secrets-management.md).
- Dependency pinning + Renovate + weekly audit — [dependency-policy](./dependency-policy.md).
- Vulnerability disclosure policy — [vulnerability-disclosure](./vulnerability-disclosure.md).

## Review cadence

- Quarterly walkthrough with all engineers.
- On any new external dependency or component.
- After every Sev-1 incident.
