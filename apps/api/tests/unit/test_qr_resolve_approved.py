"""QR resolution invariant: only APPROVED revisions are ever served, and
approval supersedes the prior active revision."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

from panelos_api.db.models.company import Company
from panelos_api.db.models.panel import Panel, PanelStatus
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.services import qr_service, revision_service


# Render Postgres JSONB as plain JSON on sqlite so the in-memory schema builds.
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(element, compiler, **kw):  # type: ignore[no-untyped-def]
    return "JSON"


async def _seed_panel(session) -> tuple[uuid.UUID, Panel]:  # type: ignore[no-untyped-def]
    company = Company(name="ACME", slug=f"acme-{uuid.uuid4().hex[:8]}")
    session.add(company)
    await session.flush()
    panel = Panel(
        company_id=company.id,
        tag="P-1",
        serial=f"SN-{uuid.uuid4().hex[:8]}",
        name="Main Panel",
        qr_token=uuid.uuid4().hex[:24],
        status=PanelStatus.OK,
    )
    session.add(panel)
    await session.flush()
    return company.id, panel


@pytest.mark.asyncio
async def test_qr_only_resolves_approved(sqlite_session) -> None:  # type: ignore[no-untyped-def]
    _company_id, panel = await _seed_panel(sqlite_session)

    # A non-approved revision pointed to by active_revision_id must NOT resolve.
    draft = PanelRevision(
        panel_id=panel.id,
        revision_letter="A",
        revision_number=1,
        status=RevisionStatus.DRAFT,
    )
    sqlite_session.add(draft)
    await sqlite_session.flush()
    panel.active_revision_id = draft.id
    await sqlite_session.flush()

    result = await qr_service.resolve_token(
        sqlite_session, token=panel.qr_token, user_id=None, ip=None, device=None
    )
    assert result["active_revision"] is None
    assert result["message"] == "no approved revision yet"


@pytest.mark.asyncio
async def test_approve_supersedes_prior_active(sqlite_session) -> None:  # type: ignore[no-untyped-def]
    company_id, panel = await _seed_panel(sqlite_session)
    actor = uuid.uuid4()

    # First approved revision.
    rev_a = await revision_service.create_draft(
        sqlite_session,
        company_id=company_id,
        actor_id=actor,
        panel_id=panel.id,
        change_summary="first",
    )
    await revision_service.transition(
        sqlite_session,
        company_id=company_id,
        actor_id=actor,
        revision_id=rev_a.id,
        action="approve",
    )
    await sqlite_session.refresh(panel)
    assert panel.active_revision_id == rev_a.id

    # QR resolves rev_a.
    res1 = await qr_service.resolve_token(
        sqlite_session, token=panel.qr_token, user_id=None, ip=None, device=None
    )
    assert res1["active_revision"]["id"] == str(rev_a.id)

    # Second revision approved -> supersedes rev_a, becomes active.
    rev_b = await revision_service.create_draft(
        sqlite_session,
        company_id=company_id,
        actor_id=actor,
        panel_id=panel.id,
        change_summary="second",
    )
    await revision_service.transition(
        sqlite_session,
        company_id=company_id,
        actor_id=actor,
        revision_id=rev_b.id,
        action="approve",
    )
    await sqlite_session.refresh(panel)
    await sqlite_session.refresh(rev_a)
    assert panel.active_revision_id == rev_b.id
    assert rev_a.status == RevisionStatus.SUPERSEDED

    res2 = await qr_service.resolve_token(
        sqlite_session, token=panel.qr_token, user_id=None, ip=None, device=None
    )
    assert res2["active_revision"]["id"] == str(rev_b.id)
