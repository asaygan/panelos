"""Audit hash chain integrity."""

from __future__ import annotations

from panelos_api.core.audit import compute_hash


def test_chain_is_deterministic() -> None:
    row = {"a": 1, "b": "x"}
    h1 = compute_hash(b"", row)
    h2 = compute_hash(b"", row)
    assert h1 == h2
    assert len(h1) == 32


def test_chain_depends_on_prev_hash() -> None:
    row = {"a": 1}
    h0 = compute_hash(b"", row)
    h1 = compute_hash(h0, row)
    assert h0 != h1


def test_chain_detects_mutation() -> None:
    a = compute_hash(b"", {"x": 1})
    b = compute_hash(b"", {"x": 2})
    assert a != b
