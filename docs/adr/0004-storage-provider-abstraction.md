# ADR-0004: Storage provider abstraction

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Different customers (and different deployment regions) prefer different blob stores. Some enterprise customers require Azure; some startups prefer Supabase; we want Cloudflare R2 for the platform tier. Local disk is essential for dev and tests. Coupling code to one SDK would force per-customer forks.

## Decision

Define a `StorageProvider` Protocol (`put`, `get`, `delete`, `presign_get`, `presign_put`) in `apps/api/src/panelos_api/storage/base.py`. Ship four implementations (`local`, `s3`, `supabase`, `azure`). Selection is env-driven via `STORAGE_PROVIDER`. See [storage](../architecture/storage.md).

## Consequences

**Positive**
- Tests run against `LocalStorage`; CI runs against MinIO via `s3`.
- A tenant can be migrated between providers without touching application code.
- Per-region deployment isolation is purely operational.

**Negative**
- Lowest-common-denominator API; provider-specific features (S3 Object Lock, Azure immutable blobs) require escape hatches.
- Presigning semantics differ; we hide diffs behind a `PresignedUpload` model with `headers` the client must include verbatim.

## Alternatives considered

1. **Use `boto3` everywhere and proxy non-S3 backends via gateways (MinIO Gateway, etc.)** — gateway projects are deprecating; we want first-class native clients.
2. **Couple to S3 only** — rejected because enterprise procurement explicitly required Azure for early pilot accounts.
