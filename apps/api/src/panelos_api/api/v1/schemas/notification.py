"""Notification schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    body: str
    params: dict[str, Any]
    link: str | None = None
    read_at: datetime | None = None
    created_at: datetime


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    unread: int
    next_before: datetime | None = None
