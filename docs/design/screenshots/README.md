# Screenshots

Production reference screenshots are mirrored from the prototype shoot at:

```
/tmp/panelhub_design/panelos/project/_shots/
```

That directory contains the canonical PNG export of every designed screen (Dashboard, Panel List, Panel Detail tabs, Revisions, Schematic Viewer, Labels, Users, Settings × N, Login). Treat those files as read-only and as the visual parity target for PR review.

## Bringing screenshots into the repo

For each release, run:

```bash
pnpm -F web screenshots:capture
```

This script launches Playwright against `pnpm dev`, walks the route table, and writes PNGs to `apps/web/screenshots/` (gitignored).

A subset is copied into this directory at release time for documentation purposes — kept under 1 MB total. The full set lives in the storage bucket under `internal/screenshots/<version>/`.

## Filename convention

```
<route>_<theme>_<accent>_<density>.png
```

Example: `panels-detail_light_blue_default.png`.
