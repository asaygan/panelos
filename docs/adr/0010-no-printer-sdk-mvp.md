# ADR-0010: No thermal printer SDK in MVP

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Customers will eventually demand direct integration with Zebra (ZPL) and Brother label printers. SDKs require per-device drivers, network discovery, and platform-specific code (Windows + macOS + Linux). MVP must ship.

## Decision

MVP renders labels as PNG/SVG and offers a **PDF imposition** to user-chosen paper stock via `reportlab`. The `LabelRenderer` Protocol reserves adapter slots for `ZplRenderer` and `BrotherRenderer`; both are stubbed but not implemented. See [labels](../architecture/labels.md).

## Consequences

**Positive**
- Zero device-specific code to ship and support in v1.
- "Print to your existing office printer" works on day one.
- Engraving vendors get SVG out of the box.

**Negative**
- Customers with thermal printers will print PDFs to those printers (which works, just suboptimal).
- A future ADR will revisit when first paying customer demands native ZPL.

## Alternatives considered

1. **Ship a single ZPL renderer in MVP** — premature; we don’t yet know which Zebra models customers run.
2. **Defer all label features** — unacceptable; labels are the central artifact of the product.
