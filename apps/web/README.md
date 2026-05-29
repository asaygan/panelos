# @panelos/web

PanelOS web application — Next.js 15 App Router, React 19, TypeScript strict.

## Quickstart

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm build
```

The API base URL is configured via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). `/api/v1/*` is rewritten to the upstream FastAPI app at build time.

## Design fidelity

The visual language is a direct port of the PanelOS design system prototype (`/tmp/panelhub_design/panelos/project/`):

- Light-primary, graphite/steel neutrals, electric-blue accent.
- Maximally-dense "trading-terminal" layout (Inter + JetBrains Mono).
- All visual tokens live as CSS custom properties in `src/styles/design-tokens.css` and are wired into Tailwind via `tailwind.config.ts`.
- Density/accent/theme variants are toggled via `data-density`, `data-accent`, `data-theme` attributes on `<html>`.

## Architecture

- `src/app/` — App Router routes (`(auth)` for login, `(app)` for shell-wrapped screens).
- `src/components/` — primitives, shell, tables, panels, labels, pdf, revisions, users, settings.
- `src/lib/api/` — typed HTTP client and endpoint helpers. Generated types land in `src/generated/openapi.ts` (run `pnpm codegen` against a running API).
- `src/middleware.ts` — gates `(app)` routes on the `panelos_session` cookie.
- QR codes use `qrcode.react`; the deterministic placeholder pattern is preserved for offline / Storybook.
- Schematic viewer uses `react-pdf`; the `blueprint` utility is reused as the loading state.

## Stubs / TODO

- `src/lib/api/types.ts` is hand-written today. Replace with `src/generated/openapi.ts` when the API exposes `/api/v1/openapi.json`.
- The dev-only Tweaks panel is gated behind `NEXT_PUBLIC_SHOW_TWEAKS=1`.
- `apple-touch-icon.png` ships as a 1×1 placeholder.
