"""Shared response shapes."""

import uuid
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class IdOnly(BaseModel):
    id: uuid.UUID


class Page[T](BaseModel):
    items: list[T]
    next_cursor: str | None = None


class ProblemDetail(BaseModel):
    type: str
    title: str
    status: int
    detail: str | None = None


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Empty(BaseModel):
    ok: bool = True
    meta: dict[str, Any] = {}
