# @panelos/ui

Shared design tokens for the PanelOS apps. This package owns the **single source of truth** for visual style:

- `styles/design-tokens.css` — CSS variables for colors, density, radii, shadows, plus base primitives (`.btn`, `.input`, `.badge`, `.card`, `.tbl`, `.tab`, `kbd`, `.blueprint`, `.stripe-placeholder`, `.overlay`, `.modal`, scrollbars).
- `tailwind-preset` — Tailwind preset that maps the CSS variables to Tailwind theme keys so `bg-canvas`, `text-ink`, `border-line`, `bg-accent`, etc. resolve to `var(--c-canvas)` and friends.
- `tokens` — typed TS object mirroring the CSS variables for JS consumers.
- `applyTheme(theme)`, `applyAccent(accent)`, `applyDensity(el, density)` — tiny runtime helpers that toggle `data-theme`, `data-accent`, `data-density` attributes on the document or any element.

## Usage

```ts
// in apps/web/src/styles/globals.css
@import '@panelos/ui/styles/design-tokens.css';
```

```js
// in tailwind.config.{js,ts}
import preset from '@panelos/ui/tailwind-preset';
export default { presets: [preset], content: [...] };
```

```ts
import { tokens, applyTheme, applyAccent, applyDensity } from '@panelos/ui';
applyTheme('dark');
applyAccent('cyan');
applyDensity(document.documentElement, 'compact');
```

No React components live here — those belong in `apps/web/src/components/`.
