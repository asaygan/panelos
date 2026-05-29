# @panelos/config

Shared configuration presets for the PanelOS monorepo.

## Subpath exports

- `@panelos/config/eslint` — base flat ESLint config (TypeScript, import/order, no-console warn).
- `@panelos/config/eslint/nextjs` — base + `next/core-web-vitals`.
- `@panelos/config/eslint/node` — base + node-specific rules.
- `@panelos/config/tsconfig/base.json` — strict TS, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `esModuleInterop`, target `es2022`, `moduleResolution: bundler`.
- `@panelos/config/tsconfig/nextjs.json` — Next.js (`jsx: preserve`, `noEmit`).
- `@panelos/config/tsconfig/library.json` — for emitting `.d.ts` library builds.
- `@panelos/config/prettier` — Prettier config.
- `@panelos/config/tailwind` — re-exports the Tailwind preset from `@panelos/ui`.
