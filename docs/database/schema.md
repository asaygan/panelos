# Database Schema Reference

Postgres 16, normalized, RLS-enforced. This page is the canonical table-by-table reference. Every table carries `id uuid PRIMARY KEY`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` (touched by trigger), and — for tenant-scoped tables — `company_id uuid NOT NULL`.

See also: [data-model](../architecture/data-model.md) (aggregates), [migrations](./migrations.md), [ADR-0006](../adr/0006-postgres-rls-for-tenancy.md).

---

## `companies`

Tenant root. One row per customer organization.

| Column | Type | Notes |
|---|---|---|
| `name` | text | Display name |
| `slug` | text UNIQUE | URL-safe identifier |
| `standards_profile` | text | e.g., `IEC`, `NEMA` — drives label fields |
| `short_name` | text | Abbreviation on dense tables |
| `logo_key` | text NULL | Storage key for logo |

---

## `users`

Auth identity. Global; not tenant-scoped.

| Column | Type | Notes |
|---|---|---|
| `email` | citext UNIQUE | Login id |
| `password_hash` | text | argon2id |
| `name` | text | Display |
| `mfa_secret` | text NULL | TOTP base32 |
| `last_login_at` | timestamptz NULL | Updated on success |

---

## `memberships`

User × Company × Role.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `user_id` | uuid FK | |
| `role` | enum | `owner / admin / engineer / technician / viewer` |
| `invited_at` | timestamptz | |
| `accepted_at` | timestamptz NULL | |

Constraint: `UNIQUE (company_id, user_id)`.

---

## `invitations`

Pending invites.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `email` | citext | |
| `role` | enum | matches memberships.role |
| `token` | text UNIQUE | 22-char nanoid |
| `expires_at` | timestamptz | |

---

## `sessions`

Refresh tokens (hashed). See [ADR-0009](../adr/0009-jwt-with-rotating-refresh.md).

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid FK | |
| `token_hash` | text | sha256 of refresh token |
| `device` | text | UA fingerprint |
| `revoked_at` | timestamptz NULL | |
| `expires_at` | timestamptz | 7 days default |

---

## `locations`

Plants / sites within a company.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `code` | text | e.g., `LIN-04` |
| `name` | text | |
| `region` | text NULL | |

---

## `panels`

**Immutable identity** — `tag`, `serial`, `qr_token` cannot be UPDATEd.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | RLS |
| `location_id` | uuid FK NULL | |
| `tag` | text | display id |
| `serial` | text | unique per tenant |
| `qr_token` | text UNIQUE (global) | 22-char nanoid |
| `name` | text | |
| `voltage` | int | volts |
| `current_a` | numeric | amps |
| `phase` | text | e.g., `3P+N+PE` |
| `mfr` | text | manufacturer |
| `enclosure` | text | e.g., `Rittal TS8` |
| `ip_class` | text | e.g., `IP54` |
| `notes` | text NULL | |
| `active_revision_id` | uuid FK NULL | exactly one `approved` revision |
| `installed_at` | timestamptz NULL | |
| `archived_at` | timestamptz NULL | |

Constraints:
- `UNIQUE (company_id, serial)`.
- Trigger `panels_identity_immutable` rejects UPDATE of `tag`, `serial`, `qr_token`.

---

## `panel_revisions`

| Column | Type | Notes |
|---|---|---|
| `panel_id` | uuid FK | |
| `revision_letter` | text | `A`, `B`, ... |
| `revision_number` | int | monotonic per panel |
| `status` | enum | `draft / review / approved / superseded / rejected` |
| `change_summary` | text | |
| `created_by` | uuid FK users | |
| `submitted_by` | uuid FK users NULL | |
| `approved_by` | uuid FK users NULL | |
| `approved_at` | timestamptz NULL | |
| `superseded_at` | timestamptz NULL | |

Constraint: `UNIQUE (panel_id, revision_number)`.

Rule: only one revision per panel may have `status='approved'`.

---

## `pdf_files`

Stored blobs.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `storage_provider` | text | `local / s3 / supabase / azure` |
| `storage_key` | text | path inside provider |
| `sha256` | text | server-verified |
| `byte_size` | bigint | |
| `mime` | text | |
| `original_filename` | text | |

---

## `revision_files`

Junction table: revisions ↔ pdf_files.

| Column | Type | Notes |
|---|---|---|
| `revision_id` | uuid FK | |
| `file_id` | uuid FK | |
| `sheet_number` | text | e.g., `01`, `02a` |
| `sheet_title` | text | e.g., "Single-line" |
| `page_index` | int | within the PDF |

---

## `components`

Per-revision BOM.

| Column | Type | Notes |
|---|---|---|
| `revision_id` | uuid FK | |
| `slot` | text | e.g., `Q1` |
| `ref` | text | e.g., `-Q1` |
| `description` | text | |
| `part_number` | text | |
| `rating` | text | e.g., `63A` |
| `type` | text | `mccb / vfd / contactor / ...` |
| `status` | text | `existing / new / replaced / removed` |

Constraint: `UNIQUE (revision_id, slot)`.

---

## `labels`

Rendered tag instances.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `panel_id` | uuid FK | |
| `revision_id` | uuid FK | snapshot |
| `template` | text | `engraved / print_bw / zpl ...` |
| `size` | text | e.g., `90x50mm` |
| `fields_json` | jsonb | snapshotted at render time |
| `output_storage_key` | text | |
| `format` | text | `png / svg / pdf / zpl` |

---

## `label_batches`

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `created_by` | uuid FK | |
| `items_json` | jsonb | ordered list of `{label_id, copies}` |
| `status` | text | `pending / rendering / ready / printed` |
| `output_storage_key` | text NULL | imposed PDF |

---

## `scan_events`

Append-only.

| Column | Type | Notes |
|---|---|---|
| `panel_id` | uuid FK | |
| `user_id` | uuid FK NULL | nullable for anonymous scans |
| `revision_id_served` | uuid FK | active at scan time |
| `ip` | inet | |
| `geo` | jsonb NULL | coarse — country/city |
| `device` | text NULL | UA |
| `at` | timestamptz | DEFAULT now() |

---

## `audit_logs`

Append-only, hash-chained.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `actor_id` | uuid FK NULL | system actor when NULL |
| `action` | text | `panel.create`, `revision.approve`, ... |
| `target_type` | text | `panel`, `revision`, `user`, ... |
| `target_id` | uuid | |
| `meta_jsonb` | jsonb | event-specific payload |
| `prev_hash` | text | last row’s hash for tenant |
| `hash` | text | `sha256(prev_hash || canonical_json(row))` |

A nightly job verifies the chain; breaks become Sev-1 alerts.

---

## `api_keys`

Future integrations.

| Column | Type | Notes |
|---|---|---|
| `company_id` | uuid FK | |
| `name` | text | display |
| `prefix` | text | first 8 chars, plaintext |
| `secret_hash` | text | argon2 |
| `scopes` | text[] | permission list |
| `last_used_at` | timestamptz NULL | |

---

## RLS

Every tenant-scoped table has:

```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table}
  USING (company_id = current_setting('app.company_id')::uuid);
```

See [multi-tenancy](../architecture/multi-tenancy.md).
