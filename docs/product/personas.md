# Personas

Four primary personas drive every product decision. Secondary personas (auditor, insurance reviewer, integration partner) are out of scope for MVP except as Viewer-role users.

---

## 1. Marta Voss — Panel Manufacturer Engineer

- **Org:** NorthForge Industrial (50-person OEM, builds MCCs and control panels).
- **Role:** Senior Electrical Engineer.
- **Goals:** Ship clean drawings; never let a customer install the wrong revision; spend less time fielding "which version do I have?" calls.
- **Pains:** Drawings live in 4 places (Vault, email, network drive, factory floor printouts). Engraving shop sends labels back with old revision letters.
- **PanelOS use:** Lives in Panel Detail → Revisions and Labels screens. Owns the approval gate.

## 2. Tomás Ricci — Factory Maintenance Lead

- **Org:** Adriatic Foods (food & beverage plant, end-customer of NorthForge).
- **Role:** Plant Maintenance Manager, 4 technicians reporting to him.
- **Goals:** Know the state of every panel in his plant; dispatch the right technician to the right asset; pass the annual IEC 61439 audit without scrambling.
- **Pains:** Inherited 17 binders of "as-built" drawings, half of which contradict the panels.
- **PanelOS use:** Dashboard and Panel List daily; Locations setup; approves Viewer access for the auditor.

## 3. Aylin Demir — Field Technician

- **Org:** Adriatic Foods, line 4.
- **Role:** Electrical maintenance tech, 6 years on the floor.
- **Goals:** Get in, fix it, get out. Read the right schematic on the phone with greasy gloves.
- **Pains:** Spotty Wi-Fi in the cold-room corridor; paper drawings in the panel pocket are wet and unreadable.
- **PanelOS use:** Mobile app only. Camera scan → schematic viewer → issue report. Offline cache critical.

## 4. Henrik Salo — Automation Firm Owner

- **Org:** Salo Automation (12-person systems integrator).
- **Role:** Founder / Owner.
- **Goals:** Differentiate from competitors who still ship binders; offer "your panels are digital" as a value-add; track which customers’ panels generate field activity.
- **Pains:** Each client has different drawing standards; can’t justify a full PLM seat per customer.
- **PanelOS use:** Owner role across all his customer tenants (one tenant per customer); jumps between orgs from the top bar.

---

Cross-reference: stories per persona in [user-stories.md](./user-stories.md); the data they touch is the BOM/Revision aggregate in [data-model](../architecture/data-model.md).
