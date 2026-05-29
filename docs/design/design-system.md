# Design System

PanelOS uses a **light-primary, maximally-dense, electric-blue** design language. Aesthetic reference: Siemens × Linear — industrial seriousness with software polish. Source tokens live at `apps/web/src/styles/design-tokens.css` (port of `/tmp/panelhub_design/panelos/project/styles.css`) and are exposed to Tailwind via `tailwind.config.ts`.

See also: [handoff](./handoff.md), [components](./components.md), [icons](./icons.md), [label-templates](./label-templates.md).

## Drivers

Theme, accent, and density are CSS-variable driven, switchable at runtime via `data-*` on `<html>`:

| Attribute | Values | Default |
|---|---|---|
| `data-theme` | `light`, `dark` | `light` |
| `data-accent` | `blue`, `cyan`, `indigo`, `steel` | `blue` |
| `data-density` | `compact`, `default`, `comfortable` | `default` |

## Color tokens (light)

### Neutral ramp (cool graphite/steel)

| Token | Hex | Use |
|---|---|---|
| `--c-canvas` | `#f4f6f8` | app background |
| `--c-surface` | `#ffffff` | cards, panels |
| `--c-surface-2` | `#fbfcfd` | subtle raised / zebra |
| `--c-surface-3` | `#eef1f4` | inset wells, hover rows |
| `--c-line` | `#e2e6ea` | hairline borders |
| `--c-line-strong` | `#d2d8de` | stronger dividers |
| `--c-ink` | `#14171a` | primary text |
| `--c-ink-2` | `#4b525b` | secondary |
| `--c-ink-3` | `#79818c` | tertiary / labels |
| `--c-ink-4` | `#9aa1ab` | faint / placeholder |

### Accent (electric blue, default)

| Token | Hex |
|---|---|
| `--c-accent` | `#3b82f6` |
| `--c-accent-700` | `#2563eb` |
| `--c-accent-600` | `#2f76ed` |
| `--c-accent-soft` | `#eaf1fe` |
| `--c-accent-line` | `#c3d8fb` |
| `--c-accent-ink` | `#1d4ed8` |

Alternate accents (`cyan`, `indigo`, `steel`) override the above via `html[data-accent="..."]` selectors.

### Status

| Token | Hex | Soft | Line | Use |
|---|---|---|---|---|
| `--c-ok` | `#1f9d57` | `#e4f6ec` | `#b9e6cb` | success, approved |
| `--c-warn` | `#c97a0e` | `#fbf0db` | `#f0d8a6` | warning, review |
| `--c-fault` | `#d8412f` | `#fbe7e4` | `#f3c4bd` | fault, rejected |
| `--c-idle` | `#6b7280` | `#eceef1` | `#d6dade` | idle, archived |
| `--c-draft` | `#7c5cff` | `#efeaff` | `#d6c9fb` | draft, in-progress |

## Dark theme overrides

| Token | Hex |
|---|---|
| `--c-canvas` | `#0e1113` |
| `--c-surface` | `#161a1d` |
| `--c-surface-2` | `#1b2024` |
| `--c-surface-3` | `#20262b` |
| `--c-line` | `#262c31` |
| `--c-line-strong` | `#333b41` |
| `--c-ink` | `#eef1f4` |
| `--c-ink-2` | `#aab3bd` |
| `--c-ink-3` | `#7e8893` |
| `--c-ink-4` | `#5d666f` |

## Typography

| Token | Family | Use |
|---|---|---|
| `--font` | `Inter`, system | UI body, headings |
| `--mono` | `JetBrains Mono`, system mono | tag, serial, qr_token, numeric tables |

| Token | Value | Use |
|---|---|---|
| `--fz` | `12.5px` (default density) | base UI / table |
| `--fz-sm` | `11px` | secondary |
| `--fz-xs` | `10px` | dense badges |
| `--fz-label` | `10.5px` | uppercase labels |

Weights used: 400 (body), 500 (UI labels), 600 (headings, emphasis), 700 (rare).

## Spacing / density

| Token | Compact | Default | Comfortable |
|---|---|---|---|
| `--row-h` | `30px` | `34px` | `42px` |
| `--pad-x` | `10px` | `12px` | `16px` |
| `--pad-y` | `5px` | `7px` | `11px` |
| `--gap` | `10px` | `12px` | `16px` |

## Radii

| Token | Value | Use |
|---|---|---|
| `--r-xs` | `3px` | chips, tags |
| `--r-sm` | `4px` | inputs, badges |
| `--r-md` | `6px` | buttons, cards |
| `--r-lg` | `8px` | modals, sheets |

## Shadows

| Token | Use |
|---|---|
| `--shadow-sm` | resting cards |
| `--shadow-md` | floating panels |
| `--shadow-lg` | modals |
| `--shadow-pop` | popovers, command palette |

## Layout constants

| Token | Value |
|---|---|
| `--sidebar-w` | `216px` |
| `--topbar-h` | `48px` |

## Tailwind mapping

Each CSS variable is surfaced as a Tailwind token in `tailwind.config.ts`:

```ts
colors: {
  canvas: 'var(--c-canvas)',
  surface: 'var(--c-surface)',
  ink: 'var(--c-ink)',
  accent: { DEFAULT: 'var(--c-accent)', 700: 'var(--c-accent-700)', soft: 'var(--c-accent-soft)' },
  ok: 'var(--c-ok)',
  warn: 'var(--c-warn)',
  fault: 'var(--c-fault)',
}
```

This lets shadcn/ui components theme through tokens without per-component overrides.
