# Compliance

PanelOS targets alignment with the standards relevant to industrial SaaS. Certification is a separate, post-MVP commercial effort; the technical groundwork is in place from day one.

## SOC 2 Type II

Goal: certification within 12 months of launch. MVP technical groundwork:

- Immutable audit log with hash chain ([data-model](../architecture/data-model.md)).
- Logical access controls via [rbac](./rbac.md).
- Change management via PR review + ADRs.
- Backup + DR drills ([backup](../operations/backup.md), [disaster-recovery](../operations/disaster-recovery.md)).
- Incident response policy ([incident-response](../operations/incident-response.md)).
- Vendor inventory + due diligence (Doppler, Vercel, Fly, Neon, Upstash, R2, Resend).

## IEC 61439

The standard for low-voltage switchgear assemblies. PanelOS supports compliance by ensuring every panel’s active revision documents:

- Nameplate fields ([label-templates](../design/label-templates.md)).
- Component ratings (BOM).
- Traceable approval (audit log).

PanelOS itself is not a certified product; it is a documentation tool that customers can present in their conformity assessment package.

## ISO 9001

Quality management. Customers using PanelOS satisfy clause **7.5 Documented information** and **8.5.2 Identification and traceability** via:

- Revision-controlled drawings.
- Engineer/Admin approval gates.
- Audit log providing chain of custody.

## GDPR

See [privacy](./privacy.md). Highlights:

- Lawful basis: contract (operating the SaaS) + legitimate interest (audit retention).
- DPA template provided to customers.
- Sub-processors disclosed in DPA and updated with 30-day notice.
- DSR (Data Subject Request) workflow: Admin-driven export and deletion.

## Future certifications

- **ISO 27001** — planned year 2.
- **HIPAA** — not in scope (no PHI).

## Evidence collection

A `compliance/` directory (planned) will hold:

- Penetration test reports (annual).
- DR drill reports (quarterly).
- Backup verification reports (weekly).
- Access review reports (quarterly).
