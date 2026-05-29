# Seed Data

The seed loader provisions a realistic tenant for local dev, e2e tests, and design QA. Source data is ported from the prototype at `/tmp/panelhub_design/panelos/project/ph-data.js`.

## What it loads

- **Company:** NorthForge Industrial (slug `northforge`, standards `IEC`).
- **Users:**
  - `m.voss@northforge.io / panelos123` — Owner.
  - `j.park@northforge.io / panelos123` — Engineer.
  - `t.adamski@northforge.io / panelos123` — Engineer.
  - `f.kobayashi@northforge.io / panelos123` — Technician.
  - `r.lopez@northforge.io / panelos123` — Viewer.
- **Locations:** 3 plants (HQ Workshop, Plant North, Plant South).
- **Panels:** 12, mix of MCCs, distribution boards, and control cabinets matching the prototype dashboard.
- **Revisions:** 5 distributed across the 12 panels (mix of `draft`, `review`, `approved`, `superseded`, one `rejected`).
- **Files:** synthetic PDFs (one per approved revision) placed in `LocalStorage` under `companies/<id>/panels/...`.
- **Components:** ~60 rows across revisions; representative BOM.
- **Scan events:** 20 historical entries to populate the activity feed.
- **Audit logs:** corresponding chain entries for every action above.

## How to run

```bash
cd apps/api
uv run alembic upgrade head
uv run python scripts/seed.py --reset
```

`--reset` truncates first (DEV ONLY — refuses to run if `ENV != dev`).

## Idempotent re-run

Without `--reset`, the seeder upserts users and locations but skips panels if any exist for the tenant.

## Test fixtures

Integration tests use a smaller fixture (`tests/fixtures/seed_min.json`) that ships 1 company, 2 users, 2 panels, 1 approved revision.

## Source mapping

| Seed entity | Source in `ph-data.js` |
|---|---|
| Panels | `PH_DATA.panels` |
| Components | `PH_DATA.components` |
| Activity | `PH_DATA.activity` |
| Revisions | `PH_DATA.revisions` |
| Users | `PH_DATA.users` |
