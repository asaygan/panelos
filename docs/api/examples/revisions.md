# API Examples — Revisions

State machine: see [revision-system](../../architecture/revision-system.md).

## Create a draft revision

```bash
curl -s "$BASE/api/v1/panels/pnl_01HV.../revisions" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{
    "revision_letter": "B",
    "change_summary": "Replace soft-starter on slot K3 with VFD"
  }'
```

## Attach a file (after upload — see files.md)

```bash
curl -s "$BASE/api/v1/revisions/rev_01HV.../files" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{
    "file_id": "fil_01HV...",
    "sheet_number": "01",
    "sheet_title": "Single-line",
    "page_index": 0
  }'
```

## Edit components (BOM)

```bash
curl -s "$BASE/api/v1/revisions/rev_01HV.../components" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{
    "slot": "K3",
    "ref": "-K3",
    "description": "VFD 7.5kW",
    "part_number": "ACS580-01-12A6-4",
    "rating": "12.6A",
    "type": "vfd",
    "status": "new"
  }'
```

## Submit for review

```bash
curl -s -X POST "$BASE/api/v1/revisions/rev_01HV.../submit" -H "$H" -H "$T"
```

## Approve

```bash
curl -s -X POST "$BASE/api/v1/revisions/rev_01HV.../approve" -H "$H" -H "$T" \
  -H 'Idempotency-Key: 7c0f0...'
```

This will atomically:
- Mark the prior approved revision `superseded`.
- Set this revision `approved`.
- Point `panels.active_revision_id` at this revision.
- Write an `audit_log` row.

## Reject

```bash
curl -s -X POST "$BASE/api/v1/revisions/rev_01HV.../reject" -H "$H" -H "$T" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Missing CB ratings on sheet 2"}'
```
