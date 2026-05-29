# ADR-0008: Monorepo with pnpm and uv

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Web (TS), API (Python), mobile (Dart), shared design tokens (TS), and shared types (TS) need to coexist with low cross-language friction. We want a single repo for atomic changes (e.g., API schema edit + matching generated TS types in the same PR).

## Decision

Use a **monorepo**:
- TypeScript workspaces via **pnpm** + **Turbo** for incremental builds.
- Python workspace via **uv** (root `pyproject.toml` defines the `panelos-api` workspace member at `apps/api`).
- Dart/Flutter lives at `apps/mobile` with its own `pubspec.yaml` (not part of pnpm or uv).
- Shared CSS/tokens at `packages/ui` (TS-built).
- Shared OpenAPI types at `packages/types` (generated).

## Consequences

**Positive**
- One PR can change API schema, regenerate types, and update web consumers atomically.
- Lockfiles are deterministic (`pnpm-lock.yaml`, `uv.lock`).
- CI matrix is straightforward.

**Negative**
- New contributors must install both `pnpm 9` and `uv` (and `flutter` for mobile).
- Workspace tooling occasionally diverges between ecosystems; we document the dance in [setup](../development/setup.md).

## Alternatives considered

1. **Polyrepo** — atomic cross-language changes require multi-repo PRs and brittle CI choreography.
2. **Nx** instead of Turbo — heavier; Turbo is sufficient for our task graph.
3. **Poetry / Hatch** instead of uv — slower install and resolution; uv is materially faster.
