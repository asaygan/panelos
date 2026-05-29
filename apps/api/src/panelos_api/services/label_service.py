"""Label rendering orchestration (SVG-first, layout-driven)."""

from __future__ import annotations

import io
import uuid
from typing import TYPE_CHECKING, Any

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.company import Company
from panelos_api.db.models.label import Label
from panelos_api.db.models.label_template import LabelTemplate
from panelos_api.db.models.location import Location
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision
from panelos_api.labels.base import LabelSpec
from panelos_api.labels.layout import (
    default_layout_for,
    is_v2_layout,
    parse_size,
    u,
)
from panelos_api.labels.raster import (
    RasterUnavailable,
    png_width_for_mm,
    svg_to_pdf,
    svg_to_png,
)
from panelos_api.labels.svg_renderer import render_svg
from panelos_api.services.qr_service import public_url_for

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider


async def _fetch_logo_bytes(storage: StorageProvider, company: Company | None) -> bytes | None:
    if company is None or not company.logo_key:
        return None
    get_bytes = getattr(storage, "get_bytes", None)
    if get_bytes is None:
        return None
    try:
        return await get_bytes(company.logo_key)
    except Exception:
        return None


async def _build_spec(
    session: AsyncSession,
    *,
    storage: StorageProvider,
    company_id: uuid.UUID,
    panel: Panel,
    concept: str,
    size_mm: tuple[float, float],
) -> tuple[LabelSpec, str, uuid.UUID | None]:
    company = await session.get(Company, company_id)

    rev_letter = "—"
    revision_id: uuid.UUID | None = None
    if panel.active_revision_id:
        rev = await session.get(PanelRevision, panel.active_revision_id)
        if rev is not None:
            rev_letter = rev.revision_letter
            revision_id = rev.id

    location_name = ""
    if panel.location_id:
        loc = await session.get(Location, panel.location_id)
        if loc is not None:
            location_name = loc.name

    logo_bytes = await _fetch_logo_bytes(storage, company)

    spec = LabelSpec(
        panel_tag=panel.tag,
        panel_name=panel.name,
        qr_token=panel.qr_token,
        qr_url=public_url_for(panel.qr_token),
        revision_letter=rev_letter,
        company_short=(company.short_name if company and company.short_name else "")
        or (company.name if company else ""),
        standards=(company.standards_profile if company else "") or "",
        size_mm=size_mm,
        template=concept,
        serial=panel.serial or "",
        voltage=panel.voltage or "",
        current=panel.current_a or "",
        phase=panel.phase or "",
        mfr=panel.mfr or "",
        enclosure=panel.enclosure or "",
        location=location_name,
        area=panel.area or "",
        company_name=(company.name if company else ""),
        logo_bytes=logo_bytes,
    )
    return spec, rev_letter, revision_id


async def render_for_panel(
    session: AsyncSession,
    *,
    storage: StorageProvider,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
    template: str = "engraved",
    fmt: str = "png",
    size: str = "90x50",
    fields: dict[str, bool] | None = None,
    template_id: uuid.UUID | None = None,
) -> Label:
    panel = await session.get(Panel, panel_id)
    if panel is None or panel.company_id != company_id:
        raise NotFound("panel not found")

    concept = template
    size_str = size
    layout: dict[str, Any] | None = None
    if template_id is not None:
        tpl = await session.get(LabelTemplate, template_id)
        if tpl is None or tpl.company_id != company_id:
            raise NotFound("label template not found")
        concept = tpl.concept
        size_str = tpl.size_mm or size
        if is_v2_layout(tpl.layout_json):
            layout = tpl.layout_json

    size_mm = parse_size(size_str)
    if layout is None:
        layout = default_layout_for(concept, *size_mm)
    else:
        # honor the template's authoritative size
        lw = layout.get("size_mm", {}).get("w")
        lh = layout.get("size_mm", {}).get("h")
        if lw and lh:
            size_mm = (float(lw), float(lh))

    spec, rev_letter, revision_id = await _build_spec(
        session,
        storage=storage,
        company_id=company_id,
        panel=panel,
        concept=concept,
        size_mm=size_mm,
    )

    svg = render_svg(spec, layout)
    png = svg_to_png(svg, png_width_for_mm(size_mm[0]))

    base = f"labels/{panel.id}/{uuid.uuid4()}"
    png_key = f"{base}.png"
    svg_key = f"{base}.svg"
    await storage.put(svg_key, io.BytesIO(svg.encode("utf-8")), "image/svg+xml")
    await storage.put(png_key, io.BytesIO(png), "image/png")

    output_key = svg_key if fmt == "svg" else png_key

    label = Label(
        company_id=company_id,
        panel_id=panel.id,
        revision_id=revision_id,
        template=concept,
        size=size_str,
        fields_json={
            "tag": panel.tag,
            "rev": rev_letter,
            "fields": dict(fields or {}),
            "png_key": png_key,
            "svg_key": svg_key,
        },
        output_storage_key=output_key,
        format=fmt,
    )
    session.add(label)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.LABEL_RENDERED,
        target_type="label",
        target_id=str(label.id),
        meta={"panel_id": str(panel.id), "template": concept, "format": fmt},
    )
    return label


async def urls_for_label(storage: StorageProvider, label: Label) -> tuple[str | None, str | None]:
    """Return ``(png_url, svg_url)`` presigned download URLs for a stored label."""
    fields = label.fields_json or {}
    png_key = fields.get("png_key")
    svg_key = fields.get("svg_key")
    png_url = await storage.presign_get(png_key) if png_key else None
    svg_url = await storage.presign_get(svg_key) if svg_key else None
    return png_url, svg_url


def _impose_svg(svgs: list[tuple[str, float, float]]) -> str:
    """Compose per-label SVGs (with their mm sizes) onto an A4 portrait sheet.

    Each entry is ``(svg_inner, w_mm, h_mm)``. Geometry stays in SVG user units
    (mm * 10); A4 portrait = 210x297mm.
    """
    page_w, page_h = 210.0, 297.0
    margin, gap = 10.0, 5.0
    pages: list[str] = []
    # use the first label's footprint for the grid
    if not svgs:
        return ""
    lw = max(w for _, w, _ in svgs)
    lh = max(h for _, _, h in svgs)
    cols = max(1, int((page_w - 2 * margin + gap) // (lw + gap)))
    rows = max(1, int((page_h - 2 * margin + gap) // (lh + gap)))
    per_page = cols * rows

    body: list[str] = []
    for idx, (svg, _w, _h) in enumerate(svgs):
        slot = idx % per_page
        if slot == 0 and idx != 0:
            pages.append("".join(body))
            body = []
        col = slot % cols
        row = slot // cols
        tx = u(margin + col * (lw + gap))
        ty = u(margin + row * (lh + gap))
        # strip outer <svg ...> wrapper, keep inner; embed via <g transform>
        inner = svg
        start = inner.find(">")
        if inner.startswith("<svg") and start != -1:
            inner = inner[start + 1 : inner.rfind("</svg>")]
        body.append(f'<g transform="translate({tx} {ty})">{inner}</g>')
    pages.append("".join(body))

    # single page sheet (first page only for PDF simplicity; multi-page would
    # need separate documents). Compose all slots that fit on page 1.
    content = pages[0]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {u(page_w)} {u(page_h)}" '
        f'width="{u(page_w)}" height="{u(page_h)}">'
        f'<rect x="0" y="0" width="{u(page_w)}" height="{u(page_h)}" fill="#ffffff" />'
        f"{content}</svg>"
    )


async def render_batch_pdf(
    session: AsyncSession,
    *,
    storage: StorageProvider,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_ids: list[uuid.UUID],
    template: str = "engraved",
    template_id: uuid.UUID | None = None,
) -> tuple[str | None, int]:
    """Render each panel to SVG, impose onto a sheet, convert to PDF, store.

    Returns ``(pdf_url, count)``.
    """
    concept = template
    size_str = "90x50"
    layout: dict[str, Any] | None = None
    if template_id is not None:
        tpl = await session.get(LabelTemplate, template_id)
        if tpl is None or tpl.company_id != company_id:
            raise NotFound("label template not found")
        concept = tpl.concept
        size_str = tpl.size_mm or size_str
        if is_v2_layout(tpl.layout_json):
            layout = tpl.layout_json

    size_mm = parse_size(size_str)
    if layout is not None:
        lw = layout.get("size_mm", {}).get("w")
        lh = layout.get("size_mm", {}).get("h")
        if lw and lh:
            size_mm = (float(lw), float(lh))

    svgs: list[tuple[str, float, float]] = []
    for pid in panel_ids:
        panel = await session.get(Panel, pid)
        if panel is None or panel.company_id != company_id:
            continue
        eff_layout = layout if layout is not None else default_layout_for(concept, *size_mm)
        spec, _rev, _rid = await _build_spec(
            session,
            storage=storage,
            company_id=company_id,
            panel=panel,
            concept=concept,
            size_mm=size_mm,
        )
        svgs.append((render_svg(spec, eff_layout), size_mm[0], size_mm[1]))

    if not svgs:
        return None, 0

    sheet = _impose_svg(svgs)
    try:
        pdf = svg_to_pdf(sheet)
        content_type = "application/pdf"
        ext = "pdf"
    except RasterUnavailable:
        # No cairo: persist the imposition SVG so the sheet is still retrievable.
        pdf = sheet.encode("utf-8")
        content_type = "image/svg+xml"
        ext = "svg"

    key = f"labels/batches/{uuid.uuid4()}.{ext}"
    await storage.put(key, io.BytesIO(pdf), content_type)
    pdf_url = await storage.presign_get(key)

    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.LABEL_RENDERED,
        target_type="label_batch",
        target_id=str(uuid.uuid4()),
        meta={"count": len(svgs), "template": concept, "format": ext},
    )
    return pdf_url, len(svgs)
