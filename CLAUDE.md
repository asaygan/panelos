# PanelOS

B2B SaaS for industrial electrical panel asset management: every panel gets a QR identity,
revision-controlled schematics, a bill of materials, maintenance history and issue tracking.
Hierarchy: **Project → System Group → Panel → Cabinet**. Multi-tenant (one company = one tenant).

- `apps/api` — FastAPI + SQLAlchemy (async) + Alembic, Postgres. Python ≥ 3.12 (uv).
- `apps/web` — Next.js 15 (App Router), React 19, Tailwind, TanStack Query, next-intl.
- `packages/types` — TypeScript types generated from the API's OpenAPI schema.
- Production: AWS eu-central-1 (App Runner API, RDS, S3, Amplify web, `panelos.io`). See `docs/deployment/aws.md`.

## Commands

```bash
# API (from apps/api) — integration tests need Docker (throwaway Postgres via testcontainers)
uv run ruff check src tests && uv run ruff format src tests
uv run pytest tests -q                         # as table owner
DB_APP_ROLE=panelos_app uv run pytest tests -q # with row-level security enforced
uv run alembic upgrade head

# Web (from apps/web)
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# After ANY API schema/route change (from repo root) — CI fails on drift
pnpm codegen
```

Pushing to `main` deploys: CI must pass, then the API image ships to App Runner (migrations run on
boot) and Amplify builds the web app.

## API rules

- **Tenant isolation is mandatory.** Every query on tenant data filters by `company_id`
  (and tables without that column are reached through a parent that has it). Any id that comes from
  a request body/path must be verified to belong to the caller's company
  (`services/tenant_refs.py`, `services/panel_access.py`). Add a cross-tenant test for new endpoints.
- Postgres RLS is the backstop: request sessions are deny-by-default
  (`db/session.py`); code that must look across tenants (login, invite, QR resolve) uses
  `Depends(get_system_db)`. New tables with `company_id` get the policy via the
  `ENSURE_TENANT_POLICIES` block (see migration 0012).
- Errors are `DomainError` subclasses with a stable `code` (`core/exceptions.py`); the web app
  translates by code. Never return ad-hoc error shapes.
- Permissions: `core/rbac.py` is the single source (`require_permission(...)`, `m.can(...)`).
- Side effects (email, notifications' mail) go through `core/outbox.after_commit` so they only fire
  after the transaction commits.
- Panel lists must go through `services/panel_presenter.py` (batched, no N+1) and respect
  location-scoped memberships (`panel_access.allowed_location_ids`).
- Sheets and BOM rows can only change while a revision is a draft (`revision_service.ensure_editable`).
- Migrations: additive, tested on a non-superuser owner role; enum values via
  `ALTER TYPE … ADD VALUE IF NOT EXISTS`.

## Web rules (`apps/web`)

**Structure**

| Path | What lives there |
| --- | --- |
| `src/components/ui/*` | Design-system primitives (Button, Field, Dialog, Table, …). No business logic. |
| `src/components/domain/*` | Shared domain pieces: status badges, `PanelPicker`, uploaders, `QrCode`, `AttachmentGallery`. |
| `src/components/app/*` | App shell: sidebar, top bar, command palette, notifications, `Can`. |
| `src/features/<area>/*` | Screen-specific components for one area (panels, revisions, issues, …). |
| `src/app/(app)/**/page.tsx` | Thin route files that compose feature components. |
| `src/data/{api,hooks,types,upload}.ts` | The only way to talk to the API. Types come from the generated schema. |
| `messages/{tr,en}/<namespace>.json` | All UI text. Turkish is the source of truth and the default language. |

**Styling**

- Tailwind classes only. **No inline `style={{}}`** except for genuinely dynamic values
  (computed widths, transforms). No raw hex colors: use the semantic tokens
  (`bg-surface`, `text-muted`, `border-border`, `text-primary`, `bg-danger-soft`, …) defined in
  `src/styles/globals.css` + `tailwind.config.ts`. They switch automatically in dark mode.
- Type scale: `text-2xs/xs/sm/base/lg/xl/2xl/3xl`; body text is `text-base` (14px). Weights: 400/500/600 only.
- Layout is mobile-first and must work from 360px wide: stack on phones, grids from `sm:`/`lg:`.
  Tables scroll horizontally inside `Table`; on phones prefer a card/list layout for primary lists.
- Page frame: `<Page>` + `<PageHeader>` from `components/ui/page`. Cards: `Card`, `CardHeader`, `CardBody`.

**Text / i18n**

- No hard-coded user-visible strings. `const t = useTranslations("panels")` (client) or
  `getTranslations` (server); add keys to **both** `messages/tr/<ns>.json` and `messages/en/<ns>.json`
  (`python3 scripts/msg.py <ns>` writes both from one `{key: [tr, en]}` JSON on stdin).
  Shared words (actions, field names, statuses, roles) already exist in `common` — reuse them.
- Dates/numbers through `useFmt()` (`src/lib/format.ts`), never `toLocaleString` by hand.
- Use Turkish domain terms consistently: pano, kabin, sistem grubu, revizyon, şema, arıza, bakım.

**Data**

- Read with hooks from `src/data/hooks.ts`; never `fetch` in a component. If an endpoint is missing
  from `src/data/api.ts`, add it there (typed with `src/data/types.ts`), then a hook.
- Every list/detail handles all three states: loading (`SkeletonRows`/`Skeleton`), error
  (`ErrorState` with a retry button calling `refetch`), empty (`EmptyState` with a next action).
- Every mutation reports its result: `toast.success(...)` and, on failure,
  `toast.error(errorText(e))` with `const errorText = useApiError()`. Never fail silently.
- Destructive actions ask first with `useConfirm()` (never `window.confirm`/`alert`).
- Hide or disable actions the user may not perform with `usePermissions().can(...)` / `<Can perm>`;
  the API enforces the same permission, the UI just shouldn't offer dead ends.
- Forms: `react-hook-form` + `zod` for anything beyond two fields; wrap controls in `<Field>` so
  labels, hints and errors are wired for accessibility. Warn before discarding unsaved edits.

**Accessibility**

- Icon-only buttons need `aria-label` (and usually a `Tooltip`). Interactive things are
  `<button>`/`<a>`, never a clickable `<div>`. Don't remove focus outlines.
- Status is never conveyed by color alone: badges carry text (and an icon where it helps).

**Never**

- Show placeholder/mock numbers or controls that do nothing. If a capability doesn't exist yet,
  leave it out.
- Put a QR code on screen that encodes anything other than `scanUrl(panel.qr_token)`.
