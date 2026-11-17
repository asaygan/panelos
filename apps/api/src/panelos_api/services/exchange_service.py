"""Bulk import / export (CSV + Excel).

Panels are matched on ``serial`` (unique per company): an existing serial is
updated, a new one is created. Projects and system groups are matched by name
and created when missing; locations must already exist (matched by code).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import ValidationFailed
from panelos_api.core.ids import new_qr_token
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.location import Location
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.project import Project
from panelos_api.db.models.system_group import SystemGroup

if TYPE_CHECKING:
    import uuid
    from collections.abc import Iterable, Sequence

    from sqlalchemy.ext.asyncio import AsyncSession

MAX_IMPORT_BYTES = 5 * 1024 * 1024
MAX_IMPORT_ROWS = 5000

# Canonical column → accepted header aliases (lower-cased, Turkish + English).
PANEL_COLUMNS: dict[str, tuple[str, ...]] = {
    "project": ("project", "proje"),
    "system_group": ("system_group", "system group", "group", "sistem grubu", "grup"),
    "tag": ("tag", "etiket", "pano etiketi"),
    "name": ("name", "ad", "pano adı", "pano adi", "panel name"),
    "serial": ("serial", "seri no", "seri", "serial number", "seri numarası"),
    "location_code": ("location_code", "location", "lokasyon", "lokasyon kodu", "saha"),
    "area": ("area", "alan", "bölüm", "bolum"),
    "voltage": ("voltage", "gerilim"),
    "current_a": ("current_a", "current", "akım", "akim"),
    "phase": ("phase", "faz"),
    "mfr": ("mfr", "manufacturer", "üretici", "uretici", "imalatçı", "imalatci"),
    "customer": ("customer", "müşteri", "musteri"),
    "enclosure": ("enclosure", "pano tipi", "kabin"),
    "ip_class": ("ip_class", "ip", "ip sınıfı", "ip sinifi"),
    "notes": ("notes", "not", "notlar", "açıklama", "aciklama"),
}
_ALIAS = {alias: col for col, aliases in PANEL_COLUMNS.items() for alias in aliases}
_LIMITS = {
    "tag": 40, "name": 200, "serial": 80, "area": 120, "voltage": 40, "current_a": 40,
    "phase": 40, "mfr": 120, "customer": 200, "enclosure": 80, "ip_class": 20, "notes": 2000,
}  # fmt: skip
_TEXT_FIELDS = (
    "area", "voltage", "current_a", "phase", "mfr", "customer", "enclosure", "ip_class", "notes",
)  # fmt: skip

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------------------------------------------------------------------------
# Tabular I/O
# ---------------------------------------------------------------------------


def _safe_cell(value: Any) -> Any:
    """Neutralize spreadsheet formula injection (cells starting with = + - @)."""

    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def to_csv(headers: Sequence[str], rows: Iterable[Sequence[Any]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(["" if v is None else _safe_cell(v) for v in row])
    # BOM so Excel opens UTF-8 (Turkish characters) correctly.
    return ("﻿" + buf.getvalue()).encode("utf-8")


def to_xlsx(headers: Sequence[str], rows: Iterable[Sequence[Any]], sheet: str = "Data") -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook(write_only=False)
    ws = wb.active
    ws.title = sheet[:31]
    ws.append(list(headers))
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for row in rows:
        ws.append(["" if v is None else _safe_cell(v) for v in row])
    ws.freeze_panes = "A2"
    for idx, header in enumerate(headers, start=1):
        ws.column_dimensions[ws.cell(row=1, column=idx).column_letter].width = max(
            12, min(40, len(str(header)) + 6)
        )
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def read_table(raw: bytes, filename: str) -> list[dict[str, str]]:
    """Parse CSV or XLSX bytes into dicts keyed by the file's (trimmed) headers."""

    if len(raw) > MAX_IMPORT_BYTES:
        raise ValidationFailed("file too large (max 5 MB)", code="file_too_large")
    name = filename.lower()
    if name.endswith(".xlsx") or raw[:2] == b"PK":
        from openpyxl import load_workbook

        try:
            wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        except Exception as exc:
            raise ValidationFailed("could not read the Excel file", code="bad_file") from exc
        ws = wb.active
        it = ws.iter_rows(values_only=True)
        try:
            header = [str(h).strip() if h is not None else "" for h in next(it)]
        except StopIteration:
            return []
        rows = []
        for values in it:
            if values is None or all(v is None or str(v).strip() == "" for v in values):
                continue
            rows.append(
                {
                    header[i]: ("" if v is None else str(v).strip())
                    for i, v in enumerate(values)
                    if i < len(header) and header[i]
                }
            )
            if len(rows) > MAX_IMPORT_ROWS:
                break
        return rows

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1254", errors="replace")  # Turkish Excel "CSV" default
    sample = text[:4096]
    delimiter = ";" if sample.count(";") > sample.count(",") else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    out = []
    for rec in reader:
        row = {(k or "").strip(): (v or "").strip() for k, v in rec.items() if k}
        if any(row.values()):
            out.append(row)
        if len(out) > MAX_IMPORT_ROWS:
            break
    return out


# ---------------------------------------------------------------------------
# Panel import
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class ImportRow:
    row: int
    action: str  # create | update | error
    tag: str = ""
    name: str = ""
    serial: str = ""
    errors: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ImportResult:
    rows: list[ImportRow]
    created: int = 0
    updated: int = 0
    failed: int = 0
    committed: bool = False
    unknown_columns: list[str] = field(default_factory=list)


def _normalize(rec: dict[str, str]) -> tuple[dict[str, str], list[str]]:
    data: dict[str, str] = {}
    unknown: list[str] = []
    for header, value in rec.items():
        col = _ALIAS.get(header.strip().lower())
        if col is None:
            unknown.append(header)
        else:
            data[col] = value.strip()
    return data, unknown


async def import_panels(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    records: list[dict[str, str]],
    dry_run: bool,
) -> ImportResult:
    if not records:
        raise ValidationFailed("the file has no data rows", code="empty_file")
    if len(records) > MAX_IMPORT_ROWS:
        raise ValidationFailed(f"too many rows (max {MAX_IMPORT_ROWS})", code="too_many_rows")

    locations = {
        code.lower(): loc_id
        for loc_id, code in (
            await session.execute(
                select(Location.id, Location.code).where(Location.company_id == company_id)
            )
        ).all()
    }
    projects = {
        p.name.lower(): p
        for p in (
            await session.execute(
                select(Project).where(
                    Project.company_id == company_id, Project.archived_at.is_(None)
                )
            )
        )
        .scalars()
        .all()
    }
    groups = {
        (g.project_id, g.name.lower()): g
        for g in (
            await session.execute(select(SystemGroup).where(SystemGroup.company_id == company_id))
        )
        .scalars()
        .all()
    }
    existing = {
        p.serial.lower(): p
        for p in (await session.execute(select(Panel).where(Panel.company_id == company_id)))
        .scalars()
        .all()
    }

    result = ImportResult(rows=[])
    unknown_cols: set[str] = set()
    seen_serials: set[str] = set()
    plan: list[tuple[ImportRow, dict[str, str]]] = []

    for idx, rec in enumerate(records, start=2):  # row 1 is the header
        data, unknown = _normalize(rec)
        unknown_cols.update(unknown)
        row = ImportRow(
            row=idx,
            action="create",
            tag=data.get("tag", ""),
            name=data.get("name", ""),
            serial=data.get("serial", ""),
        )
        if not data.get("name"):
            row.errors.append("name_required")
        if not data.get("serial"):
            row.errors.append("serial_required")
        elif data["serial"].lower() in seen_serials:
            row.errors.append("duplicate_serial_in_file")
        else:
            seen_serials.add(data["serial"].lower())
        for col, limit in _LIMITS.items():
            if len(data.get(col, "")) > limit:
                row.errors.append(f"{col}_too_long")
        if data.get("location_code") and data["location_code"].lower() not in locations:
            row.errors.append("unknown_location")
        if data.get("system_group") and not data.get("project"):
            row.errors.append("project_required_for_group")
        if row.errors:
            row.action = "error"
            result.failed += 1
        elif data["serial"].lower() in existing:
            row.action = "update"
            result.updated += 1
        else:
            result.created += 1
        result.rows.append(row)
        plan.append((row, data))

    result.unknown_columns = sorted(unknown_cols)
    if dry_run or result.failed:
        return result

    for row, data in plan:
        group_id: uuid.UUID | None = None
        if data.get("project"):
            project = projects.get(data["project"].lower())
            if project is None:
                project = Project(company_id=company_id, name=data["project"][:200])
                session.add(project)
                await session.flush()
                projects[project.name.lower()] = project
            group_name = data.get("system_group") or "General"
            group = groups.get((project.id, group_name.lower()))
            if group is None:
                group = SystemGroup(
                    company_id=company_id, project_id=project.id, name=group_name[:200]
                )
                session.add(group)
                await session.flush()
                groups[(project.id, group_name.lower())] = group
            group_id = group.id
        fields: dict[str, Any] = {k: (data[k] or None) for k in _TEXT_FIELDS if k in data}
        if "location_code" in data:
            fields["location_id"] = (
                locations.get(data["location_code"].lower()) if data["location_code"] else None
            )
        if group_id is not None:
            fields["system_group_id"] = group_id

        if row.action == "update":
            panel = existing[data["serial"].lower()]
            panel.name = data["name"]
            if data.get("tag"):
                panel.tag = data["tag"]
            for key, value in fields.items():
                setattr(panel, key, value)
        else:
            from panelos_api.services.panel_service import _slug_tag, _unique_tag

            tag = data.get("tag") or await _unique_tag(
                session, company_id=company_id, base=_slug_tag(data["name"])
            )
            panel = Panel(
                company_id=company_id,
                tag=tag,
                serial=data["serial"],
                name=data["name"],
                qr_token=new_qr_token(),
                **fields,
            )
            session.add(panel)
            await session.flush()
            existing[panel.serial.lower()] = panel

    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANELS_IMPORTED,
        target_type="company",
        target_id=str(company_id),
        meta={"created": result.created, "updated": result.updated},
    )
    result.committed = True
    return result


def export_stamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%d-%H%M")
