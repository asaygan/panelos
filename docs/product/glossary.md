# Glossary

Domain terms used throughout PanelOS docs and code. Keep this file canonical — when a new term appears in a doc, add it here.

| Term | Definition |
|---|---|
| **MCC** | Motor Control Center. A factory-assembled enclosure containing multiple motor starter units (combination starters, VFDs) on a common bus. |
| **MCCB** | Molded-Case Circuit Breaker. Self-contained breaker used in distribution panels at moderate current ratings. |
| **ACB** | Air Circuit Breaker. Higher-current breaker used at the incoming feeder of larger boards. |
| **VFD** | Variable Frequency Drive. Adjusts motor speed by varying frequency to its windings. |
| **Single-line diagram** | Schematic representation of a three-phase electrical system using one line to represent all three phases. The canonical "what’s in this panel" drawing. |
| **Schematic** | Generic term for any electrical drawing attached to a panel revision: single-line, control, layout, terminal list. |
| **BOM** | Bill of Materials. Tabular list of components in a revision (slot, ref, part number, rating). |
| **Revision** | A versioned, approved set of drawings and components for a panel. Letter (A, B…) for major; number for minor sequence. |
| **Active revision** | The single revision per panel currently in `approved` state and pointed to by `panels.active_revision_id`. |
| **Superseded** | Terminal state for a previously approved revision after a newer one is approved. |
| **NEMA** | National Electrical Manufacturers Association. Source of enclosure ratings (NEMA 1, 4, 4X, 12, 7/9). |
| **IP class** | Ingress Protection rating from IEC 60529 (e.g., IP54, IP66). Two digits: solids, liquids. |
| **IEC 61439** | International standard for low-voltage switchgear and controlgear assemblies. Drives required nameplate data. |
| **ISO 9001** | Quality management system standard. Demands documented change control — PanelOS revisions satisfy this. |
| **Enclosure** | The physical cabinet (Rittal AE, Hoffman, OEM steel). |
| **Slot** | A logical position within a panel where a component lives (e.g., `Q1`, `K2`). |
| **Ref** | Reference designator from the schematic (e.g., `-Q1`, `=A1+K12`). |
| **QR token** | 22-character nanoid stored on a panel, encoded in its QR label, never updatable. See [qr-system](../architecture/qr-system.md). |
| **Tenant / Company** | Top-level isolation boundary in PanelOS. One company = one tenant. |
| **Membership** | A user’s role within a single tenant. Users may be members of multiple tenants. |
| **RLS** | Postgres Row-Level Security. See [ADR-0006](../adr/0006-postgres-rls-for-tenancy.md). |
| **Engraved label** | Dark phenolic plastic tag, white-engraved text — the long-life nameplate. |
| **Print label** | Adhesive B/W label printed on standard 90×50mm office stock. |
| **ZPL** | Zebra Programming Language. Used by Zebra thermal printers (future). |
| **Audit chain** | Hash-chained `audit_logs` table giving tamper-evidence. |
| **Scan event** | A row written every time a QR is resolved (mobile or web). Drives maintenance history. |
| **Standards profile** | A per-tenant preset (e.g., "IEC", "NEMA") that drives label templates and required fields. |
