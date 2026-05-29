# Backup

See also: [backup-restore](../database/backup-restore.md) for the technical mechanics; [disaster-recovery](./disaster-recovery.md) for targets.

## Daily

- `pg_dump --format=custom --compress=9` at 02:00 UTC.
- Encrypted with provider KMS, uploaded to a separate "backup" bucket.
- Retention: 30 daily, 12 monthly, 7 yearly.

## Continuous

- Postgres WAL archived to write-once bucket every 60 seconds.
- Retention: 7 days.

## Storage

- R2 / S3 provider-side replication enabled (object versioning).
- Weekly `aws s3 sync` to cold bucket (Glacier or R2 Infrequent Access).

## Restores tested

- Weekly: latest dump restored to staging; assertions run.
- Quarterly: full DR drill — restore to a fresh region; bring API up; run e2e smoke.
- Annual: tabletop exercise with operations + customer success.

## Owners

| Backup | Primary | Backup owner |
|---|---|---|
| Postgres dump + WAL | DB on-call | Platform lead |
| Storage replication | Platform on-call | DB on-call |
| Secret rotation backup | Security lead | Platform lead |

## What is **not** backed up

- Application logs (rebuildable via re-runs / acceptable loss).
- Generated QR images (idempotently re-render from token).
- Generated label images (idempotently re-render from `fields_json`).
