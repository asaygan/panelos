# Design Handoff

Source-of-truth prototype is at `/tmp/panelhub_design/panelos/project/`. This page is the mapping table between prototype files and production directories under `apps/web/src/`.

## File-to-directory map

| Prototype file | Production area | Notes |
|---|---|---|
| `styles.css` | `apps/web/src/styles/design-tokens.css` + `tailwind.config.ts` | Near-1:1 port |
| `ph-shell.jsx` | `apps/web/src/components/shell/*` | Sidebar, TopBar, TopNav, CommandPalette |
| `ph-components.jsx` | `apps/web/src/components/primitives/*` + `components/icons/*` | All primitives + icon wrapper |
| `ph-screens-1.jsx` | `app/(auth)/login`, `app/(app)/dashboard`, `app/(app)/panels` | Login, Dashboard, Panel List |
| `ph-screens-2.jsx` | `app/(app)/panels/[id]/*`, `components/pdf/*` | Panel Detail tabs, Revisions, Schematic Viewer (real PDF via react-pdf, not blueprint placeholder) |
| `ph-screens-3.jsx` | `app/(app)/labels`, `app/(app)/users`, `app/(app)/settings/*`, `components/labels/*` | Labels, Settings, Users |
| `ph-data.js` | `apps/api/scripts/seed.py` | Seed fixtures |
| `tweaks-panel.jsx` | `components/shell/TweaksDrawer.tsx` + `components/tweaks/ThemeProvider.tsx` | Theme/accent/density runtime |
| `ph-app.jsx` | reference only — App Router uses real routes | |
| `_shots/*.png` | [./screenshots/](./screenshots/) | Reference screenshots for visual QA |

## Visual parity checklist (used in PR review)

- Light mode + dark mode each screen.
- All four accents (`blue`, `cyan`, `indigo`, `steel`).
- All three densities.
- Sidebar layout AND TopNav layout.

## What the production code intentionally differs on

| Prototype | Production | Why |
|---|---|---|
| Blueprint placeholder in Schematic Viewer | `react-pdf` real render | actual product |
| Inline QR placeholder | `qrcode.react` (client preview) + server-rendered canonical | see [qr-system](../architecture/qr-system.md) |
| Mock data via `ph-data.js` | TanStack Query against real API | live data |
| All-in-one HTML test harness | App Router routes | structure |
