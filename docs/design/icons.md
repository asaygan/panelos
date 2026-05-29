# Icons

We use **lucide-react** through a thin `<Icon name="..." />` wrapper. Direct imports from `lucide-react` are forbidden outside `components/icons/index.tsx` so the bundle stays tight and themable.

## Subset

The MVP uses these lucide icons. Add to this list whenever a new icon ships.

| Name | Use |
|---|---|
| `LayoutDashboard` | Dashboard nav |
| `Grid2x2` | Panel list nav |
| `FileStack` | Revisions nav |
| `FileText` | Schematic viewer |
| `Tag` | Labels nav |
| `Users` | Users screen |
| `Settings` | Settings screen |
| `Search` | Top bar, palette |
| `Bell` | Notifications |
| `User` | Avatar fallback |
| `LogOut` | Account menu |
| `ChevronRight` | Disclosure |
| `ChevronDown` | Disclosure |
| `Check` | Confirm |
| `X` | Close |
| `Plus` | Create |
| `Filter` | Table filter |
| `MoreHorizontal` | Row menu |
| `QrCode` | QR section |
| `ScanLine` | Scan event |
| `MapPin` | Location |
| `Building2` | Company |
| `Wrench` | Maintenance |
| `Power` | Voltage |
| `Activity` | Live data |
| `History` | Audit |
| `AlertTriangle` | Warn / fault |
| `CheckCircle2` | Approved |
| `Clock` | Review queue |
| `ArrowUpRight` | External link |
| `Download` | Export |
| `Upload` | File upload |
| `Printer` | Print labels |
| `Sun` / `Moon` | Theme toggle |
| `Sliders` | Tweaks drawer |

## Adding a new icon

1. Confirm it exists in [lucide.dev](https://lucide.dev).
2. Add the import to `components/icons/index.tsx`:
   ```ts
   import { Hammer } from 'lucide-react'
   export const ICONS = { ..., hammer: Hammer }
   ```
3. Use it: `<Icon name="hammer" />`.
4. Update this file.

## Sizing

Default `16px`. Sizes via the `size` prop (`12 / 14 / 16 / 18 / 20`). Stroke width `1.75` (set in the wrapper).

## Color

Inherits `currentColor`. Status icons use the matching status token (`text-ok`, `text-warn`, etc.).
