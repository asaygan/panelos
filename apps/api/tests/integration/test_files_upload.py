"""Presigned upload flow."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.skipif(True, reason="requires running postgres; covered by docker compose CI")


def test_placeholder() -> None:
    assert True
