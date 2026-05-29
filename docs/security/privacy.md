# Privacy

PanelOS processes minimal personal data: user profiles and scan event metadata. Schematics and BOMs are *organizational* data, not personal data.

## Lawful basis (GDPR)

- **Contract** — to operate the SaaS for the customer (Article 6(1)(b)).
- **Legitimate interest** — fraud prevention, audit log retention (Article 6(1)(f)).

## Personal data inventory

| Field | Source | Category | Purpose |
|---|---|---|---|
| `users.email` | self-supplied at signup | identifier | login, notifications |
| `users.name` | self-supplied | identifier | UI display |
| `users.password_hash` | derived | credential | auth |
| `sessions.device` | UA header | technical | session listing |
| `scan_events.ip` | request | technical | abuse prevention |
| `scan_events.geo` | derived from IP | technical (coarse) | maintenance insight |
| `audit_logs.actor_id` | session | identifier | accountability |

## Retention

| Data | Retention |
|---|---|
| User profile | While membership exists + 30 days after deletion of last membership |
| Sessions | TTL (7d) + 90 days for forensics |
| Scan events | **2 years** |
| Audit logs | **7 years** |
| Backup snapshots | per [backup](../operations/backup.md) schedule |
| Customer schematics + BOMs | Until tenant deletes them; on tenant termination, 30-day grace then purge |

## Data subject rights

- **Access:** Owner/Admin can export a tenant; an individual user can export their own data via Profile → Export.
- **Rectification:** Profile edit screen.
- **Erasure:** User deletion replaces `actor_id` in audit logs with `pseudonym:<sha256(email)>`; the log otherwise remains.
- **Portability:** Tenant export is JSON + PDFs.
- **Objection / restriction:** Handled case-by-case by Owner with platform support.

## Sub-processors

Disclosed in the DPA and on the public sub-processors page:

| Sub-processor | Purpose |
|---|---|
| Vercel | Web hosting |
| Fly.io | API hosting |
| Neon | Postgres |
| Upstash | Redis |
| Cloudflare R2 | Object storage |
| Resend | Transactional email |
| Doppler | Secret storage |
| Grafana Cloud | Telemetry |

30-day notice before any change.

## International transfers

All sub-processors offer EU regions; we deploy production in EU by default. Customers may request US-only deployment for an additional contractual term.

## Cookies

Strict-functional only (auth + tenant). No analytics cookies in MVP. Cookie banner not required when only strict-functional cookies are used.
