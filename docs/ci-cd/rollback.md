# Rollback

Roll forward where possible; roll back only when the new release is broken and a forward fix would take longer than tolerable.

## API rollback (Fly.io)

```bash
fly releases -a panelos-api
# pick the previous release id
fly deploy -a panelos-api --image ghcr.io/<org>/panelos-api:<prev-sha>
```

Or via CI:

```bash
gh workflow run cd-api.yml --ref main -f tag=api-vX.Y.PREV
```

Time to recover: typically < 5 minutes (one machine swap).

## Web rollback (Vercel)

```bash
vercel rollback https://panelos.app
# or via dashboard: Deployments → previous → Promote to Production
```

Time to recover: under 60 seconds.

## Database rollback

**Do not** `alembic downgrade` in production. The correct path:

1. Ship a **forward migration** that reverses the schema change.
2. If the new release wrote data the old release cannot read, the rollback also requires a data backfill or a feature flag to make the old code tolerant.

For destructive schema changes, the original PR should have shipped behind a flag and with a separate "drop legacy" migration scheduled at least one release later — making rollback trivial.

## Storage rollback

Object storage is content-addressable (`sha256`). There is no "rollback" — bad uploads are simply discarded via `revision_files` row removal. If a renderer regression produced bad images, re-render after deploying the fixed renderer.

## Configuration rollback

- Doppler maintains version history per secret. Restore prior value, redeploy.
- Feature flags can be toggled instantly via Redis without a deploy.

## Coordinated rollback

If web and API shipped together and the new web requires the new API:

1. Roll back web first (≤ 1 min).
2. Confirm error rate drops.
3. Roll back API (≤ 5 min).

If the new API ships a breaking DB migration, you must roll forward — see Database section above.

## Communicating

- Statuspage: "Investigating" → "Identified" → "Resolved — we have rolled back release X to mitigate".
- Internal channel: link to the runbook used and the timeline.
- Postmortem within 48h for any rollback triggered by a customer-visible bug.
