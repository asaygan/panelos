# API Examples — Panels

```bash
BASE=https://api.panelos.app
H="Authorization: Bearer $ACCESS"
T="X-PanelOS-Tenant: $COMPANY_ID"
```

## Create a panel

```bash
curl -s "$BASE/api/v1/panels" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{
    "tag": "MCC-3",
    "serial": "NF-2026-0091",
    "name": "Mixing Line MCC",
    "location_id": "loc_01HV...",
    "voltage": 400,
    "current_a": 250,
    "phase": "3P+N+PE",
    "mfr": "NorthForge",
    "enclosure": "Rittal TS8",
    "ip_class": "IP54",
    "notes": "Installed under awning, ambient 40C"
  }'
```

Response includes the generated `qr_token` (immutable) and a `qr_url` for label rendering.

## List panels with grouping & filters

```bash
curl -s "$BASE/api/v1/panels?location_id=loc_01HV...&status=approved&sort=-created_at&limit=50" \
  -H "$H" -H "$T"
```

## Get one panel

```bash
curl -s "$BASE/api/v1/panels/pnl_01HV..." -H "$H" -H "$T"
```

## Archive a panel

```bash
curl -s -X POST "$BASE/api/v1/panels/pnl_01HV.../archive" -H "$H" -H "$T"
```

## Public scan (unauthenticated)

```bash
curl -sL "$BASE/api/v1/qr/Z9ZXcwLk8mKf3pNqQpRr2k"
```

Records a `scan_event`, returns minimal panel JSON (or 302 to the web app when called via browser).
