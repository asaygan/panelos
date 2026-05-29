# Label Layout Schema v2 — Rendering Contract

> **Single source of truth.** Backend (`apps/api`) and web (`apps/web`) MUST implement the geometry rules below identically so that on-screen preview == exported PNG/SVG/PDF. Do not invent different math.

## Coordinate system & constants

- All element geometry is authored in **millimetres (mm)**, origin top-left, y-axis down.
- SVG `viewBox = "0 0 {w_mm*UNITS_PER_MM} {h_mm*UNITS_PER_MM}"`.
- **`UNITS_PER_MM = 10`** → 1 mm = 10 SVG user units. (Both sides.)
- **`PT_TO_U = 254 / 72` ≈ 3.527778** → SVG `font-size = size_pt * PT_TO_U` (because 1pt = 1/72 in, 1 in = 25.4 mm = 254 units).
- mm→units helper: `u(mm) = mm * 10`.
- Backend rasterizes the SVG with cairosvg; raster width px = `w_mm * 10 * (dpi/254)` for `dpi=300` ⇒ `output_width = round(w_mm * 10 * 300/254)`. (cairosvg `output_width` param; height auto.) Web displays the same SVG scaled to fit its container — geometry identical because both use the same viewBox.

## Document

```jsonc
{
  "version": 2,
  "orientation": "landscape" | "portrait",   // convenience; geometry is in size_mm
  "size_mm": { "w": number, "h": number },
  "background": { "kind": "engraved" | "plain", "fill": "#hex", "radius_mm": number },
  "grid_mm": number,                          // editor snap step (default 1)
  "elements": Element[]                        // drawn in ascending z
}
```

Orientation toggle = swap `size_mm.w` ↔ `size_mm.h` (and update `orientation`). Renderers only read `size_mm`.

## Element (common fields)

`{ id, type, x, y, w, h, rotation, z, visible }` — x/y/w/h in mm, rotation in degrees (clockwise), z integer, visible bool (skip if false).

Rotation: apply `transform="rotate({rotation} {cx} {cy})"` where `cx=u(x+w/2)`, `cy=u(y+h/2)`.

### `field` and `text`

- `field`: `{ binding, font, size_pt, weight, align, color, uppercase?, letter_spacing? }` — text content = resolved binding value (see map).
- `text`: same but `{ text }` literal instead of `binding`.
- Render as one `<text>`, vertically centered in the box:
  - `y = u(y + h/2)`, attribute `dominant-baseline="central"`.
  - align `left` → `x=u(x)`, `text-anchor="start"`; `center` → `x=u(x+w/2)`, `text-anchor="middle"`; `right` → `x=u(x+w)`, `text-anchor="end"`.
  - `font-size = size_pt * PT_TO_U`; `font-family`: `sans`→`Inter`, `mono`→`JetBrains Mono`; `font-weight=weight`; `fill=color`.
  - `letter-spacing = u(letter_spacing)` if set. `uppercase` → uppercase the string before render.
  - No auto-wrap, no auto-shrink (MVP); author boxes generously.

### `qr`

- `{ binding: "scan_url", fg, bg, quiet }` (quiet zone in mm, default 1).
- Compute QR modules from the resolved `scan_url`, **error correction level "M"** on both sides (web: `qrcode`; backend: `segno.make(url, error="m")`). Module patterns may differ between libs — acceptable; both encode the same URL.
- Draw `<rect>` bg filling the box (`fill=bg`), then the module grid centered, sized `min(w,h) - 2*quiet` mm, modules as `fg` rects with `shape-rendering="crispEdges"`.

### `logo`

- `{ source: "company" | "none", fit: "contain" }`.
- Backend: company `logo_key` bytes → `<image href="data:{mime};base64,..." />` fit contain in box. If no logo, draw a rounded `<rect fill="#14171a">` with the company monogram (first letters) centered in white.
- Web: same, using the company logo URL (or monogram fallback).

### `line`

- `{ stroke, stroke_w }` → `<line x1=u(x) y1=u(y) x2=u(x+w) y2=u(y+h) stroke stroke-width=u(stroke_w) />`.

### `box`

- `{ fill, stroke, stroke_w, radius }` → `<rect x=u(x) y=u(y) width=u(w) height=u(h) rx=u(radius) fill stroke stroke-width=u(stroke_w) />`. `fill:"none"` for outline-only.

## Background rules

Draw first, full-bleed `<rect x=0 y=0 width=u(w) height=u(h) rx=u(radius_mm)>`:

- **plain**: `fill = background.fill` (typically `#ffffff`); 1px hairline border `#c9ccd0` (`stroke-width=u(0.2)`).
- **engraved**: `fill` = vertical linear gradient stops `#2c3137 @0%`, `#1b1f24 @55%`, `#23282e @100%`; then:
  - inset engraved border: `<rect>` at 2 mm inset, `fill=none stroke=#ffffff24 stroke-width=u(0.25) rx=u(1)`.
  - 4 screw holes at corners `(3,3),(w-3,3),(3,h-3),(w-3,h-3)` mm, radius `1.2` mm, radial-gradient fill `#4a525a→#0c0e10`.

## Binding resolver (`binding → string`)

| binding | value |
|---|---|
| `tag` | panel.tag |
| `name` | panel.name |
| `serial` | panel.serial |
| `rev` | revision letter (active/latest), e.g. `E` |
| `voltage` | panel.voltage |
| `current` | panel.current_a |
| `phase` | panel.phase |
| `mfr` | panel.mfr |
| `enclosure` | panel.enclosure |
| `location` | location name |
| `area` | panel.area |
| `company` | company.name |
| `company_short` | company.short_name |
| `standards` | company.standards_profile (e.g. `IEC 61439`) |
| `scan_url` | `{APP_URL}/q/{panel.qr_token}` |

A `qr` element's content is the `scan_url` value. Missing values render empty string.

## Fonts

Bundle **Inter** (400/600/700) and **JetBrains Mono** (400/600/700) TTFs in `apps/api/src/panelos_api/labels/assets/`. Backend embeds them as base64 `@font-face` in the `<defs><style>` of every SVG **and** the Docker image installs them to `/usr/share/fonts` + `fc-cache` (cairosvg fallback). Web uses the same families already loaded via `next/font`.

---

## Example layouts (anchor the style — backend authors all 10 from §4 of the plan)

### #1 Industrial Engraved — landscape 90×50 (default; preserves current engraved look)

```json
{
  "version": 2, "orientation": "landscape", "size_mm": { "w": 90, "h": 50 },
  "background": { "kind": "engraved", "fill": "#1f242b", "radius_mm": 1.8 }, "grid_mm": 1,
  "elements": [
    { "id":"border","type":"box","x":2,"y":2,"w":86,"h":46,"rotation":0,"z":0,"visible":true,"fill":"none","stroke":"#ffffff24","stroke_w":0.25,"radius":1 },
    { "id":"logo","type":"logo","x":5,"y":4.5,"w":6,"h":6,"rotation":0,"z":1,"visible":true,"source":"company","fit":"contain" },
    { "id":"brand","type":"field","binding":"company_short","x":12.5,"y":5,"w":40,"h":5,"rotation":0,"z":2,"visible":true,"font":"sans","size_pt":7,"weight":700,"align":"left","color":"#cdd6df","letter_spacing":0.12 },
    { "id":"tag","type":"field","binding":"tag","x":5,"y":25,"w":50,"h":11,"rotation":0,"z":3,"visible":true,"font":"mono","size_pt":22,"weight":700,"align":"left","color":"#ffffff" },
    { "id":"name","type":"field","binding":"name","x":5,"y":36,"w":50,"h":5,"rotation":0,"z":4,"visible":true,"font":"sans","size_pt":8,"weight":400,"align":"left","color":"#9aa6b2","uppercase":true },
    { "id":"div","type":"line","x":5,"y":22,"w":50,"h":0,"rotation":0,"z":2,"visible":true,"stroke":"#ffffff1f","stroke_w":0.3 },
    { "id":"serial","type":"field","binding":"serial","x":5,"y":43,"w":30,"h":4,"rotation":0,"z":5,"visible":true,"font":"mono","size_pt":7.5,"weight":400,"align":"left","color":"#dde4ec" },
    { "id":"rev","type":"field","binding":"rev","x":38,"y":43,"w":14,"h":4,"rotation":0,"z":5,"visible":true,"font":"mono","size_pt":7.5,"weight":400,"align":"left","color":"#dde4ec" },
    { "id":"qr","type":"qr","binding":"scan_url","x":62,"y":11,"w":24,"h":24,"rotation":0,"z":6,"visible":true,"fg":"#000000","bg":"#ffffff","quiet":1 },
    { "id":"scancap","type":"text","text":"SCAN FOR DOCS","x":60,"y":37,"w":28,"h":3,"rotation":0,"z":6,"visible":true,"font":"sans","size_pt":5.5,"weight":600,"align":"center","color":"#7d8a97","letter_spacing":0.1 }
  ]
}
```

### #2 Printable B/W — landscape 90×50 (preserves current print look)

```json
{
  "version": 2, "orientation": "landscape", "size_mm": { "w": 90, "h": 50 },
  "background": { "kind": "plain", "fill": "#ffffff", "radius_mm": 1 }, "grid_mm": 1,
  "elements": [
    { "id":"hdr","type":"box","x":0,"y":0,"w":90,"h":8,"rotation":0,"z":0,"visible":true,"fill":"#000000","stroke":"none","stroke_w":0,"radius":0 },
    { "id":"brand","type":"field","binding":"company","x":3,"y":0.5,"w":55,"h":6,"rotation":0,"z":1,"visible":true,"font":"sans","size_pt":7,"weight":800,"align":"left","color":"#ffffff","letter_spacing":0.12,"uppercase":true },
    { "id":"asset","type":"text","text":"PANELOS ASSET","x":55,"y":0.5,"w":32,"h":6,"rotation":0,"z":1,"visible":true,"font":"sans","size_pt":6,"weight":600,"align":"right","color":"#ffffff" },
    { "id":"qr","type":"qr","binding":"scan_url","x":4,"y":12,"w":26,"h":26,"rotation":0,"z":2,"visible":true,"fg":"#000000","bg":"#ffffff","quiet":1 },
    { "id":"qrborder","type":"box","x":4,"y":12,"w":26,"h":26,"rotation":0,"z":1,"visible":true,"fill":"none","stroke":"#000000","stroke_w":0.5,"radius":0 },
    { "id":"tag","type":"field","binding":"tag","x":34,"y":11,"w":52,"h":12,"rotation":0,"z":2,"visible":true,"font":"mono","size_pt":24,"weight":800,"align":"left","color":"#000000" },
    { "id":"name","type":"field","binding":"name","x":34,"y":23,"w":52,"h":5,"rotation":0,"z":2,"visible":true,"font":"sans","size_pt":8,"weight":600,"align":"left","color":"#000000" },
    { "id":"sn","type":"field","binding":"serial","x":34,"y":31,"w":30,"h":4,"rotation":0,"z":2,"visible":true,"font":"mono","size_pt":7,"weight":700,"align":"left","color":"#000000" },
    { "id":"rev","type":"field","binding":"rev","x":66,"y":31,"w":20,"h":4,"rotation":0,"z":2,"visible":true,"font":"mono","size_pt":7,"weight":700,"align":"left","color":"#000000" },
    { "id":"foot","type":"line","x":4,"y":42,"w":82,"h":0,"rotation":0,"z":1,"visible":true,"stroke":"#000000","stroke_w":0.3 },
    { "id":"std","type":"field","binding":"standards","x":4,"y":43,"w":30,"h":4,"rotation":0,"z":2,"visible":true,"font":"mono","size_pt":6,"weight":400,"align":"left","color":"#000000" },
    { "id":"url","type":"field","binding":"scan_url","x":40,"y":43,"w":46,"h":4,"rotation":0,"z":2,"visible":true,"font":"mono","size_pt":6,"weight":400,"align":"right","color":"#000000" }
  ]
}
```

Templates #3–#10 (sizes/orientations/concepts per plan §4) follow the same element vocabulary and rules; portrait templates simply have `size_mm.w < h` and stack elements vertically.
