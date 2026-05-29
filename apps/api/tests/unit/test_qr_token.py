"""QR token generator."""

from __future__ import annotations

from panelos_api.core.ids import QR_TOKEN_LENGTH, new_qr_token


def test_qr_token_length_and_alphabet() -> None:
    seen: set[str] = set()
    for _ in range(2000):
        t = new_qr_token()
        assert len(t) == QR_TOKEN_LENGTH
        assert all(ch.isalnum() for ch in t)
        seen.add(t)
    assert len(seen) == 2000  # uniqueness with high probability
