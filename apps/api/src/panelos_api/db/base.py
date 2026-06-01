"""SQLAlchemy declarative base and shared mixins."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, ClassVar

from sqlalchemy import DateTime, ForeignKey, MetaData, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from panelos_api.core.ids import new_uuid

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Project-wide SQLAlchemy declarative base."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)

    type_annotation_map: ClassVar[dict[Any, Any]] = {
        uuid.UUID: PG_UUID(as_uuid=True),
    }


class UUIDPKMixin:
    """UUIDv7 primary key column."""

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=new_uuid
    )


def _utcnow() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    """created_at / updated_at columns.

    Timestamps are computed Python-side (``default``/``onupdate`` callables) so the
    ORM never has to re-fetch a server-recomputed value after INSERT/UPDATE. A
    server-side ``server_default`` is kept as a backstop for raw SQL / migrations.
    Using ``onupdate=func.now()`` (server-side) would expire ``updated_at`` after an
    UPDATE and trigger a sync lazy-load on attribute access — fatal under async
    (``MissingGreenlet``) when pydantic ``model_validate`` reads the attribute.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        server_default=func.now(),
        nullable=False,
    )


class TenantMixin:
    """Adds company_id for RLS / tenant scoping."""

    company_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
