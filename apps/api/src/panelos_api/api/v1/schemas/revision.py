"""Revision schemas."""

import uuid
from datetime import datetime

from panelos_api.api.v1.schemas.common import ORMModel
from panelos_api.db.models.panel_revision import RevisionStatus


class RevisionOut(ORMModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    revision_letter: str
    revision_number: int
    status: RevisionStatus
    change_summary: str | None = None
    review_note: str | None = None
    created_by: uuid.UUID | None = None
    submitted_by: uuid.UUID | None = None
    approved_by: uuid.UUID | None = None
    rejected_by: uuid.UUID | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    rejected_at: datetime | None = None
    superseded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # Denormalized for lists (filled by the router; no extra client round-trips).
    panel_tag: str | None = None
    panel_name: str | None = None
    created_by_name: str | None = None
    submitted_by_name: str | None = None
    approved_by_name: str | None = None
    rejected_by_name: str | None = None
    sheet_count: int = 0
    component_count: int = 0


class RevisionCreateIn(ORMModel):
    change_summary: str | None = None


class RevisionUpdateIn(ORMModel):
    change_summary: str | None = None


class RevisionDecisionIn(ORMModel):
    note: str | None = None
