# ADR-0005: Revision and panel-identity immutability

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

The product promise is "scan the QR, see the right schematic." If panel identity or approved revisions could mutate in place, the QR label engraved on a steel cabinet could outlive its data — a compliance and safety issue.

## Decision

1. The panel’s identity (`tag`, `serial`, `qr_token`) is immutable after insert; a Postgres trigger raises on UPDATE of these columns.
2. A `panel_revisions` row in state `approved` or `superseded` is immutable; the application layer rejects writes, and a row-level trigger raises on changes to a finite set of columns.
3. Edits become **new revisions**. Approving a new revision atomically supersedes the prior one in the same transaction.

## Consequences

**Positive**
- Engraved labels are forever valid.
- Audit log diffs are trivial — compare snapshot to snapshot.
- Approved history is real history; you can rewind to any prior approved state by changing `panels.active_revision_id`.

**Negative**
- Storage grows monotonically; we accept this and address with lifecycle policies in [backup](../operations/backup.md).
- Engineers occasionally want to "tweak" an approved revision; UX must guide them to a new draft instead.

## Alternatives considered

1. **Mutable revisions with version_number bumped on save** — rejected; audit trail becomes a delta log instead of a snapshot log, harder to reason about under compliance review.
2. **CRDT-style merge of revisions** — unnecessary; revisions are sequenced by a human approval step.
