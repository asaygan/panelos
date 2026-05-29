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
    created_by: uuid.UUID | None = None
    approved_by: uuid.UUID | None = None
    approved_at: datetime | None = None
    superseded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class RevisionCreateIn(ORMModel):
    change_summary: str | None = None
