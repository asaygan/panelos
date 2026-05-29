# Architecture Diagram Sources

Mermaid source files for the diagrams embedded in the architecture docs. Render to SVG via:

```bash
pnpm dlx @mermaid-js/mermaid-cli -i input.mmd -o output.svg
```

| Source | Embedded in |
|---|---|
| `c4-context.mmd` | [../overview.md](../overview.md) |
| `c4-containers.mmd` | [../overview.md](../overview.md) |
| `backend-layering.mmd` | [../backend.md](../backend.md) |
| `frontend-render.mmd` | [../frontend.md](../frontend.md) |
| `aggregates.mmd` | [../data-model.md](../data-model.md) |
| `storage-upload.mmd` | [../storage.md](../storage.md) |
| `revision-state.mmd` | [../revision-system.md](../revision-system.md) |
| `qr-resolver.mmd` | [../qr-system.md](../qr-system.md) |
| `label-render.mmd` | [../labels.md](../labels.md) |
| `multi-tenancy.mmd` | [../multi-tenancy.md](../multi-tenancy.md) |
