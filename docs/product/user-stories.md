# User Stories

Grouped by role. Each story uses the standard "As a … I want … so that …" form. Acceptance criteria are concrete enough to test from [docs/development/testing.md](../development/testing.md).

## Owner

- **U-O-1** As an Owner I want to create my company tenant and invite the first Admin so that my team can start using PanelOS without contacting support.
- **U-O-2** As an Owner I want to see fleet-wide KPIs (panel count, revisions in queue, recent scans) on the Dashboard so that I can gauge adoption.
- **U-O-3** As an Owner I want to toggle the org-level setting "Engineer-approval allowed" so that smaller teams can run without an Admin bottleneck. See [rbac](../security/rbac.md).
- **U-O-4** As an Owner I want to view (but not edit) the immutable audit log so that I can prove compliance during an audit.

## Admin

- **U-A-1** As an Admin I want to invite new users by email with a role, expiring in 7 days, so that access is bounded.
- **U-A-2** As an Admin I want to revoke a user’s membership immediately so that ex-employees lose access.
- **U-A-3** As an Admin I want to configure locations (plants/sites) so that engineers can place panels on the right floor.
- **U-A-4** As an Admin I want to approve or reject revisions on behalf of Engineers when escalations occur.

## Engineer

<a id="engineer"></a>

- **U-E-1** As an Engineer I want to create a panel with tag, serial, voltage, current, phase, OEM, enclosure, IP class, and location so that it has a canonical identity.
- **U-E-2** As an Engineer I want a panel’s identity (tag, serial, qr_token) to be immutable after creation so that QR labels never become stale. See [ADR-0005](../adr/0005-revision-immutability.md).
- **U-E-3** As an Engineer I want to upload one or more PDFs to a draft revision and tag each sheet (Schematic / Layout / BOM) so that field staff find the right sheet quickly.
- **U-E-4** As an Engineer I want to submit a draft to Review, approve it, or reject it with a reason so that revisions follow a state machine.
- **U-E-5** As an Engineer I want the previously approved revision to become "superseded" automatically on approval so that there is never more than one active revision.
- **U-E-6** As an Engineer I want to render an engraved-style label and a B/W print label with QR + nameplate fields so that I can stick or affix them to the cabinet.
- **U-E-7** As an Engineer I want to send a batch of labels to a PDF imposition matching my paper stock so that I can print on shared office hardware.

## Technician

- **U-T-1** As a Technician I want to open the camera, scan the panel QR, and see the current active revision so that I am never servicing a stale schematic.
- **U-T-2** As a Technician I want to view the schematic offline once cached so that connectivity drops on the floor don’t block me.
- **U-T-3** As a Technician I want to file an "issue report" referencing the panel so that engineering knows there’s a discrepancy.
- **U-T-4** As a Technician I want my scan to be logged with timestamp and (optional) geo so that maintenance history is auditable.

## Viewer

- **U-V-1** As a Viewer I want read-only access to panels and current revisions so that auditors, insurance reviewers, and contractors can be granted least-privilege access.
- **U-V-2** As a Viewer I want my actions to never appear as writes in the audit log so that the audit trail stays clean.

## Cross-role

- **U-X-1** As any user I want a ⌘K command palette that fuzzy-searches panels, locations, and people so that navigation is keyboard-first.
- **U-X-2** As any user I want a light/dark theme + density + accent toggle so that the app feels native on the floor and in the office.
