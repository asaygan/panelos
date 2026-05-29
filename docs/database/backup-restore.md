# Backup and Restore

Strategy: nightly logical dump + continuous WAL archiving for point-in-time recovery (PITR). Targets in [disaster-recovery](../operations/disaster-recovery.md): RPO 1h, RTO 4h.

## Nightly logical dump

```bash
pg_dump \
  --format=custom --compress=9 \
  --no-owner --no-acl \
  --dbname="$DATABASE_URL" \
  --file="/backups/panelos-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

- Runs at 02:00 UTC on a dedicated cron host.
- Encrypted at rest (provider KMS) + uploaded to a separate object bucket with bucket-level versioning.
- Retention: 30 daily, 12 monthly, 7 yearly.

## Continuous WAL archiving

On the primary, `archive_command` ships WAL segments to a write-once bucket:

```
archive_mode = on
archive_command = 'aws s3 cp %p s3://panelos-wal/%f'
wal_level = replica
```

WAL retention: 7 days. Combined with the latest base backup this gives ≤1h RPO.

## Verify

Weekly automated test on staging:

1. Restore latest dump to a throwaway instance.
2. Replay WAL up to t-30min.
3. Run a SQL fixture that asserts counts and an audit-chain verifier.
4. Tear down.

## Restore — point-in-time

```bash
# 1. Provision empty Postgres instance
# 2. Restore base backup
pg_restore -d "$NEW_DB" /backups/panelos-latest.dump

# 3. Configure recovery
cat > recovery.signal <<EOF
restore_command = 'aws s3 cp s3://panelos-wal/%f %p'
recovery_target_time = '2026-05-28 14:30:00+00'
EOF

# 4. Start postgres; it replays WAL to target.
```

## Storage backups

Object storage is replicated across regions by the provider (R2: automatic, S3: cross-region replication enabled). Storage snapshots happen weekly via `aws s3 sync` to a cold bucket.

## Runbooks

- [database-failover](../operations/runbooks/database-failover.md)
- [storage-outage](../operations/runbooks/storage-outage.md)
