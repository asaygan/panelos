"""Revision state machine — pure logic tests against allowed transitions."""

from __future__ import annotations

import pytest

from panelos_api.db.models.panel_revision import RevisionStatus
from panelos_api.services.revision_service import ALLOWED, _next_letter


@pytest.mark.parametrize(
    "action,from_status,allowed",
    [
        ("submit", RevisionStatus.DRAFT, True),
        ("submit", RevisionStatus.REVIEW, False),
        ("submit", RevisionStatus.APPROVED, False),
        ("approve", RevisionStatus.DRAFT, True),
        ("approve", RevisionStatus.REVIEW, True),
        ("approve", RevisionStatus.APPROVED, False),
        ("approve", RevisionStatus.REJECTED, False),
        ("reject", RevisionStatus.DRAFT, True),
        ("reject", RevisionStatus.REVIEW, True),
        ("reject", RevisionStatus.APPROVED, False),
        ("supersede", RevisionStatus.APPROVED, True),
        ("supersede", RevisionStatus.DRAFT, False),
    ],
)
def test_allowed_transitions(action: str, from_status: RevisionStatus, allowed: bool) -> None:
    assert (from_status in ALLOWED[action]) is allowed  # type: ignore[index]


def test_next_letter_basic() -> None:
    assert _next_letter(None) == "A"
    assert _next_letter("A") == "B"
    assert _next_letter("E") == "F"
    assert _next_letter("Z") == "ZA"
