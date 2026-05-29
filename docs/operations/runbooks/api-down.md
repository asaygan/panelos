# Runbook — API Down

**Symptom:** `/api/v1/health` returns non-200, or all API requests time out.
**Severity:** Sev-1.
**Page:** on-call engineer.

## Triage (first 5 minutes)

1. Check Grafana dashboard `PanelOS / API Health`. Look for:
   - Request rate cliff.
   - p99 latency spike.
   - Error rate > 5%.
2. Check Fly.io status: `fly status -a panelos-api`. Note machine count and last deploy.
3. Check upstream status:
   - Neon (Postgres) status page.
   - Upstash (Redis) status page.
   - Cloudflare incidents.

## Common causes

| Cause | Signal | Action |
|---|---|---|
| Bad recent deploy | Failure starts at deploy time | Roll back: see [rollback](../../ci-cd/rollback.md) |
| DB pool exhausted | `asyncpg.PoolTimeout` in logs | Scale API down to drain; scale Postgres pool |
| Postgres failover in progress | Neon status | Wait; verify reconnect after |
| Out-of-memory on Fly | `OOMKilled` in Fly events | Scale memory class up |
| Hot key on Redis | rate-limit storm | Flush key; investigate upstream caller |

## Rollback

```bash
gh workflow run cd-api.yml -f tag=api-vPREV.Y.Z
# or
fly releases -a panelos-api
fly deploy -a panelos-api --image ghcr.io/<org>/panelos-api:<previous-sha>
```

## Communication

- Open Statuspage incident as "Investigating".
- Post in `#incidents` Slack with `/incident open`.
- Update Statuspage every 30 minutes minimum.

## After mitigation

- Confirm health green for 15 minutes.
- Close Statuspage with summary.
- Schedule postmortem within 48h — template in [incident-response](../incident-response.md).
