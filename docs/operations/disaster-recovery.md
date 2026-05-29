# Disaster Recovery

## Targets

| Metric | Target |
|---|---|
| RPO (data loss) | ≤ 1 hour |
| RTO (time to recover) | ≤ 4 hours |

## Scenarios

### Postgres region unavailable

- Promote standby in another region (Neon: automatic; AWS: manual).
- Update `DATABASE_URL` secret.
- Redeploy API.
- RTO: 30–60 min. RPO: < 1 min (synchronous replication on critical writes).

### Storage region unavailable

- Cross-region replicated read works for cached objects.
- New uploads paused via feature flag.
- Promote secondary bucket once provider declares incident.
- RTO: 15–60 min. RPO: 0 (replication).

### API host unavailable (Fly region down)

- Fly auto-fails to next region in the app’s region list.
- DNS unchanged.
- RTO: 5–15 min. RPO: 0.

### Web host unavailable

- Vercel multi-region by default.
- Worst case: status page banner + direct API access for power users.

### Full account compromise (Doppler, GitHub, Vercel, or Fly)

1. Activate break-glass account from sealed envelope.
2. Rotate every secret ([rotate-jwt-keys](./runbooks/rotate-jwt-keys.md) + analogous for DB, storage, email).
3. Revoke all refresh tokens.
4. Audit `audit_logs` for the compromise window.
5. Notify customers within 72h per [privacy](../security/privacy.md).

## Drills

- Quarterly DR drill (restore Postgres dump + WAL to fresh region; bring API up; verify e2e).
- Annual tabletop including communications and legal.

## Documentation

Every drill produces a report stored in `docs/operations/dr-drills/<date>.md` (out of MVP scope; the directory will be created on first drill).
