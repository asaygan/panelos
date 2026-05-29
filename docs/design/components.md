# Component Inventory

Inventory of UI primitives and composites in `apps/web/src/components/`, mapped from the prototype files in `/tmp/panelhub_design/panelos/project/`. See [handoff](./handoff.md) for the prototype-to-production mapping table.

## Shell

| Component | Path | Source |
|---|---|---|
| `Sidebar` | `components/shell/Sidebar.tsx` | `ph-shell.jsx` |
| `TopBar` | `components/shell/TopBar.tsx` | `ph-shell.jsx` |
| `TopNav` | `components/shell/TopNav.tsx` | `ph-shell.jsx` (alt layout) |
| `CommandPalette` | `components/shell/CommandPalette.tsx` | `ph-shell.jsx` (⌘K) |
| `TweaksDrawer` | `components/shell/TweaksDrawer.tsx` | `tweaks-panel.jsx` |

## Primitives

| Component | Path | Source |
|---|---|---|
| `Btn` | `components/primitives/Btn.tsx` | `ph-components.jsx` |
| `Badge` | `components/primitives/Badge.tsx` | `ph-components.jsx` |
| `Avatar` | `components/primitives/Avatar.tsx` | `ph-components.jsx` |
| `Menu` | `components/primitives/Menu.tsx` | `ph-components.jsx` |
| `Modal` | `components/primitives/Modal.tsx` | `ph-components.jsx` |
| `Input` | `components/primitives/Input.tsx` | `ph-components.jsx` |
| `Field` | `components/primitives/Field.tsx` | `ph-components.jsx` |
| `Meta` | `components/primitives/Meta.tsx` | `ph-components.jsx` (key/value row) |
| `Empty` | `components/primitives/Empty.tsx` | `ph-components.jsx` |

## Tables

| Component | Path | Source |
|---|---|---|
| `DataTable` | `components/tables/DataTable.tsx` | `ph-screens-*.jsx` |
| `GroupedTable` | `components/tables/GroupedTable.tsx` | Panel List grouping |

## Panel surfaces

| Component | Path | Source |
|---|---|---|
| `PanelDetailTabs` | `components/panels/PanelDetailTabs.tsx` | `ph-screens-2.jsx` |
| `RevisionTimeline` | `components/panels/RevisionTimeline.tsx` | `ph-screens-2.jsx` |
| `ComponentsTable` | `components/panels/ComponentsTable.tsx` | `ph-screens-2.jsx` |
| `SchematicViewer` | `components/pdf/SchematicViewer.tsx` | `ph-screens-2.jsx` (react-pdf) |

## Labels

| Component | Path | Source |
|---|---|---|
| `EngravedTag` | `components/labels/EngravedTag.tsx` | `ph-screens-3.jsx` |
| `PrintTag` | `components/labels/PrintTag.tsx` | `ph-screens-3.jsx` |
| `QRGlyph` | `components/labels/QRGlyph.tsx` | `qrcode.react` wrapper |

## Theme

| Component | Path | Notes |
|---|---|---|
| `ThemeProvider` | `components/tweaks/ThemeProvider.tsx` | manages `data-theme/accent/density` |

## Conventions

- All primitives accept `className` and forward `ref` (via `React.forwardRef`).
- No prop-driven styling — variants via `cva` (class-variance-authority).
- Icons via `<Icon name="..." />` only; never import lucide-react directly outside `components/icons/`.
