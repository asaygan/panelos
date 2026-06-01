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

API wiring uses two env vars:

- **`NEXT_PUBLIC_API_BASE`** (browser, default `/api/v1`) — the relative path the client calls. Stays relative in every environment so requests are same-origin and auth cookies flow through.
- **`API_INTERNAL_URL`** (server/build, default `http://localhost:8000`) — the upstream FastAPI origin the Next rewrite proxies `/api/v1/*` to. In prod set it to the API's public URL. The legacy `NEXT_PUBLIC_API_URL` is still honored as a fallback.

## Design fidelity

The visual language is a direct port of the PanelOS design system prototype (`/tmp/panelhub_design/panelos/project/`):

- Light-primary, graphite/steel neutrals, electric-blue accent.
- Maximally-dense "trading-terminal" layout (Inter + JetBrains Mono).
- All visual tokens live as CSS custom properties in `src/styles/design-tokens.css` and are wired into Tailwind via `tailwind.config.ts`.
- Density/accent/theme variants are toggled via `data-density`, `data-accent`, `data-theme` attributes on `<html>`.

## Architecture

- `src/app/` — App Router routes (`(auth)` for login, `(app)` for shell-wrapped screens).
- `src/components/` — primitives, shell, tables, panels, labels, pdf, revisions, users, settings.
- `src/lib/api/` — typed HTTP client and endpoint helpers. API DTOs come from the generated OpenAPI schema in `@panelos/types/generated` (run `pnpm codegen`); `src/lib/api/adapters.ts` maps those DTOs to the UI view-models in `types.ts`.
- `src/middleware.ts` — gates `(app)` routes on the `panelos_session` cookie.
- QR codes use `qrcode.react`; the deterministic placeholder pattern is preserved for offline / Storybook.
- Schematic viewer uses `react-pdf`; the `blueprint` utility is reused as the loading state.

## Stubs / TODO

- The dev-only Tweaks panel is gated behind `NEXT_PUBLIC_SHOW_TWEAKS=1`.
- `apple-touch-icon.png` ships as a 1×1 placeholder.
