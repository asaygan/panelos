# Webhooks

PanelOS sends webhooks to customer-configured HTTPS endpoints when notable events occur. Configuration lives at `Settings → Integrations`.

## Event catalog

| Event | When |
|---|---|
| `panel.created` | Panel inserted |
| `panel.archived` | Panel archived |
| `revision.submitted` | Draft → review |
| `revision.approved` | Review → approved (the prior approved is auto-superseded) |
| `revision.rejected` | Review → rejected |
| `label.batch.ready` | Render job complete |
| `scan.recorded` | QR scan event written |
| `user.invited` | Invitation created |
| `user.joined` | Invitation accepted |

## Payload shape

```json
{
  "id": "evt_01HV...",
  "type": "revision.approved",
  "occurred_at": "2026-05-29T12:34:56+00:00",
  "company_id": "cmp_01HV...",
  "actor_id": "usr_01HV...",
  "data": {
    "revision_id": "rev_01HV...",
    "panel_id": "pnl_01HV...",
    "previous_active_id": "rev_01HU..."
  }
}
```

## Signing

Header `PanelOS-Signature: t=<unix_ms>,v1=<hex(hmac_sha256(secret, t + '.' + body))>`. Verify by recomputing; reject if older than 5 minutes.

## Retry policy

- 3xx and 2xx: success.
- 4xx: do not retry (delivery considered terminal).
- 5xx / timeout: retry with exponential backoff: 30s, 2m, 10m, 1h, 6h, 24h (max 6 attempts).
- After max attempts the event is parked; admins can manually retry from Settings → Integrations.

## Ordering

PanelOS does **not** guarantee global ordering. Consumers should rely on `occurred_at` and idempotently apply events using `id`.

## Local testing

Use [Smee.io](https://smee.io) or `ngrok` and the "Send test event" button in Settings → Integrations.
