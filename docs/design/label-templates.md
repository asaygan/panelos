# Label Templates

Specs for the two MVP label templates. See [labels architecture](../architecture/labels.md), [ADR-0010](../adr/0010-no-printer-sdk-mvp.md).

## Default dimensions

| Aspect | Value |
|---|---|
| Width × Height | 90 × 50 mm |
| Print DPI | 300 |
| Bleed | 0 (cut to edge) |
| Margins | 3 mm safe zone all sides |
| QR module size | minimum 0.5 mm; render at 32 × 32 modules |
| QR error correction | level H (30%) |

## Engraved template (dark phenolic, white-engraved)

Used as the long-life nameplate, engraved by external vendor from an SVG.

```
+--------------------------------------------------+
|  [QR]      TAG: MCC-3                           |
|  32x32     400V · 250A · 3P+N+PE                |
|            NorthForge · S/N NF-2026-0091         |
|            IP54 · IEC 61439-2                    |
+--------------------------------------------------+
```

- QR at left, 28 × 28 mm.
- Tag: JetBrains Mono Bold, 22pt.
- Specs: Inter Medium, 9pt, single-line stack.
- Bottom-right: compliance line — `IEC 61439-2` or `NEMA` per tenant profile.

## Print B/W template

Adhesive 90×50mm office paper. Same layout, black ink on white.

- Tag: JetBrains Mono Bold, 18pt.
- Compliance line always present.
- Optional logo at top-right if `companies.logo_key` set.

## Fields snapshot

`labels.fields_json` schema:

```json
{
  "tag": "MCC-3",
  "voltage": "400V",
  "current": "250A",
  "phase": "3P+N+PE",
  "mfr": "NorthForge",
  "serial": "NF-2026-0091",
  "ip_class": "IP54",
  "compliance": "IEC 61439-2"
}
```

Snapshotted at render so re-renders months later are byte-identical.

## Future templates

- `zpl` for Zebra (ADR-0010 reserves slot).
- `brother` for P-Touch.
- A future template editor in `Settings → Branding` will produce a template DSL stored per tenant.
