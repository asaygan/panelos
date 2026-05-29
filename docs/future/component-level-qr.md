# Component-Level QR

The MVP attaches a single QR to the panel. Component-level QR codes — one per breaker, contactor, terminal block — open richer field workflows.

## Use cases

- "What is this terminal?" — point camera at TB-12, see ratings, downstream load, last test date.
- Preventive maintenance routes generated as scan sequences.
- Warranty + service history per component.

## Data model deltas (planned)

A new aggregate `ComponentInstance` (live, mutable physical object) joins:

- `Component` (BOM definition in a revision) — already exists.
- `ComponentInstance` — physical instance with its own QR, serial, install date, last service date.

```sql
CREATE TABLE component_instances (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  panel_id uuid NOT NULL,
  component_id uuid NOT NULL,   -- BOM ref, latest known
  qr_token text UNIQUE NOT NULL,
  install_date date,
  last_service_at timestamptz,
  status text                  -- ok / warn / fault
);
```

## QR sizing

Component QR codes are smaller (e.g., 15 × 15 mm) and require thermal printing for cost — see [labels](../architecture/labels.md), [ADR-0010](../adr/0010-no-printer-sdk-mvp.md). Zebra/Brother adapters become real before this ships.

## Scaling concern

A typical MCC has 30–200 components → tokens explode quickly. The `qr_token` index is sized for it (nanoid 22-char gives ~131 bits entropy — far more than needed).

## UI

- Panel detail gains a "Components" tab variant: scannable, grouped by slot.
- Mobile scanner recognizes both panel-level and component-level QRs by token prefix (planned: separate `cmp_` vs `pnl_` prefix on URL path).

## Out of scope (still)

- Per-component approval workflows. Components inherit revision approval.
