# Roadmap

The forward-looking plan beyond MVP. Specific feature designs live as siblings of this file. The roadmap is intentionally light on dates — priorities shift with customer signal.

## Near-term (next 1–2 quarters)

- **Native Zebra ZPL renderer.** Unlock direct thermal printing. See [labels](../architecture/labels.md), [ADR-0010](../adr/0010-no-printer-sdk-mvp.md).
- **Mobile MVP** flows: scanner, viewer, offline cache, issue reporting. See [offline-sync](./offline-sync.md).
- **SAML SSO** for enterprise tenants. Endpoint stubs already in place.
- **Custom roles** beyond the fixed 5.
- **Per-tenant data residency** (EU-only / US-only deploys).

## Mid-term (3–6 months)

- **OCR on uploaded schematics.** See [ocr-vision](./ocr-vision.md).
- **BOM parsing assist.** See [bom-parsing](./bom-parsing.md).
- **Brother / Dymo label adapters.**
- **Webhook destination library** (Slack, Teams, MS Flow, n8n).

## Longer-term (6–12 months)

- **RAG-based assistant** over schematics + BOMs + audit history. See [ai-rag-plan](./ai-rag-plan.md).
- **Component-level QR codes.** See [component-level-qr](./component-level-qr.md).
- **Digital twin** view per panel. See [digital-twin](./digital-twin.md).
- **Multi-region active-active** for very large tenants.

## Always-on tracks

- Security hardening (annual pentest, SOC 2 audit prep).
- Documentation upkeep — this doc tree is the source of truth.
- Design system polish.
- Customer-driven UX refinements.
