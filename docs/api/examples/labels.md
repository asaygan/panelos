# API Examples — Labels

Background: [labels architecture](../../architecture/labels.md), [label templates](../../design/label-templates.md).

## Render a single label

```bash
curl -s "$BASE/api/v1/labels" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{
    "panel_id": "pnl_01HV...",
    "template": "engraved",
    "size": "90x50mm",
    "fields": {
      "tag": "MCC-3",
      "voltage": "400V",
      "current": "250A",
      "phase": "3P+N+PE",
      "mfr": "NorthForge",
      "serial": "NF-2026-0091",
      "ip_class": "IP54"
    }
  }'
```

Response carries `output_storage_key` and a short-lived `preview_url`.

## Render a batch and impose to PDF

```bash
curl -s "$BASE/api/v1/labels/batches" -H "$H" -H "$T" \
  -H 'Idempotency-Key: 1c0e...' \
  -H 'Content-Type: application/json' \
  -d '{
    "template": "print_bw",
    "size": "90x50mm",
    "items": [
      {"panel_id":"pnl_01HV...A","copies":1},
      {"panel_id":"pnl_01HV...B","copies":2}
    ]
  }'
```

Response:

```json
{
  "batch_id": "lbb_01HV...",
  "status": "rendering"
}
```

Poll `/api/v1/labels/batches/lbb_01HV...` until `status: ready`, then `download_url` is populated.
