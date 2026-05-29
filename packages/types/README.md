# @panelos/types

Shared TypeScript types for PanelOS, generated from the FastAPI backend's OpenAPI schema, plus a small set of hand-written domain enums that mirror the backend's Python enums.

## Codegen

Run while the API is running locally:

```bash
pnpm codegen
```

This calls `openapi-typescript http://localhost:8000/api/v1/openapi.json -o ./src/generated/api.ts`. Commit the regenerated file so consumers always get a typed schema even without backend access.

## Public surface

- `import type { paths, components } from '@panelos/types'` — full OpenAPI shape.
- `import { Role, RevisionStatus, PanelStatus, FileMime } from '@panelos/types'` — hand-written enums mirroring the backend.
