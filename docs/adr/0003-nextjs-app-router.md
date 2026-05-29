# ADR-0003: Next.js 15 App Router for the web

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

The web app must render a dense, interactive admin UI plus a public QR resolver. We want React server components for shells and lists, and client components for tables, modals, and the command palette. SEO is not a concern except for the marketing surface.

## Decision

Use **Next.js 15 (App Router)**, **TypeScript strict**, **Tailwind CSS** with a custom token preset (sourced from the design system in [design-system](../design/design-system.md)), and **shadcn/ui** primitives where appropriate.

## Consequences

**Positive**
- Server components reduce client JS for list pages.
- Route Handlers give us the QR resolver as a small server-side redirect — no React rendered.
- Vercel deploy is one command; preview URLs per PR.
- File-based routing matches the screen list cleanly.

**Negative**
- The App Router is younger than Pages Router; teams pay an onboarding cost.
- Server actions vs API routes vs client mutations is a *taste* decision per feature; we document the policy in [frontend](../architecture/frontend.md).
- Edge runtime is not used for the API gateway — middleware sticks to auth/tenant gating, not heavy logic.

## Alternatives considered

1. **Remix** — equally capable but smaller ecosystem and fewer matching design libraries.
2. **SvelteKit** — productivity gain not worth the smaller TS/React talent pool.
3. **Next.js Pages Router** — proven but loses the layout/streaming wins of App Router.
