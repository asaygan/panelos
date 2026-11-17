"""Issues, maintenance and attachments."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from panelos_api.api.v1.schemas.common import ORMModel

Severity = Literal["low", "medium", "high", "critical"]
IssueState = Literal["open", "in_progress", "resolved", "closed"]
MaintKind = Literal[
    "inspection", "preventive", "corrective", "thermography", "cleaning", "test", "other"
]
MaintResult = Literal["ok", "attention", "fail"]


class AttachmentOut(BaseModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    issue_id: uuid.UUID | None = None
    maintenance_id: uuid.UUID | None = None
    file_id: uuid.UUID
    filename: str
    mime: str
    byte_size: int
    caption: str | None = None
    uploaded_by: uuid.UUID | None = None
    uploaded_by_name: str | None = None
    created_at: datetime
    # Short-lived signed URL (inline display / download).
    url: str


class AttachmentCreateIn(BaseModel):
    file_id: uuid.UUID
    caption: str | None = Field(default=None, max_length=300)
    issue_id: uuid.UUID | None = None
    maintenance_id: uuid.UUID | None = None


class IssueOut(ORMModel):
    id: uuid.UUID
    number: int
    panel_id: uuid.UUID
    title: str
    description: str | None = None
    severity: Severity
    status: IssueState
    reported_by: uuid.UUID | None = None
    assigned_to: uuid.UUID | None = None
    resolved_by: uuid.UUID | None = None
    resolved_at: datetime | None = None
    resolution_note: str | None = None
    created_at: datetime
    updated_at: datetime
    panel_tag: str | None = None
    panel_name: str | None = None
    reported_by_name: str | None = None
    assigned_to_name: str | None = None
    attachment_count: int = 0


class IssueDetailOut(IssueOut):
    attachments: list[AttachmentOut] = Field(default_factory=list)


class IssueCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    severity: Severity = "medium"
    file_ids: list[uuid.UUID] = Field(default_factory=list, max_length=10)


class IssueUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    severity: Severity | None = None
    status: IssueState | None = None
    assigned_to: uuid.UUID | None = None
    resolution_note: str | None = Field(default=None, max_length=5000)


class MaintenanceOut(ORMModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    plan_id: uuid.UUID | None = None
    issue_id: uuid.UUID | None = None
    kind: MaintKind
    result: MaintResult
    summary: str
    findings: str | None = None
    performed_at: datetime
    performed_by: uuid.UUID | None = None
    performed_by_name: str | None = None
    created_at: datetime
    panel_tag: str | None = None
    panel_name: str | None = None
    attachment_count: int = 0


class MaintenanceCreateIn(BaseModel):
    # Omitted: taken from the plan when plan_id is given, else "inspection".
    kind: MaintKind | None = None
    result: MaintResult = "ok"
    summary: str = Field(min_length=3, max_length=300)
    findings: str | None = Field(default=None, max_length=5000)
    performed_at: datetime | None = None
    # Free text when the work was done by someone without an account.
    performed_by_name: str | None = Field(default=None, max_length=200)
    plan_id: uuid.UUID | None = None
    issue_id: uuid.UUID | None = None
    # With issue_id: also mark that issue resolved.
    resolve_issue: bool = False
    file_ids: list[uuid.UUID] = Field(default_factory=list, max_length=10)


class PlanOut(ORMModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    title: str
    kind: MaintKind
    interval_days: int
    next_due_on: date
    active: bool
    notes: str | None = None
    created_at: datetime
    panel_tag: str | None = None
    panel_name: str | None = None
    # Negative = overdue by that many days.
    days_until_due: int = 0


class PlanCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    kind: MaintKind = "preventive"
    interval_days: int = Field(gt=0, le=3650)
    next_due_on: date
    notes: str | None = Field(default=None, max_length=5000)


class PlanUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    kind: MaintKind | None = None
    interval_days: int | None = Field(default=None, gt=0, le=3650)
    next_due_on: date | None = None
    active: bool | None = None
    notes: str | None = Field(default=None, max_length=5000)
