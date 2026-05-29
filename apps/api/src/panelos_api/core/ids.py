"""ID generators: nanoid for tokens, uuid7 for primary keys."""

from __future__ import annotations

import uuid

from nanoid import generate as _nanoid_generate

try:
    from uuid7 import uuid7 as _uuid7
except ImportError:  # pragma: no cover

    def _uuid7() -> uuid.UUID:  # type: ignore[no-redef]
        return uuid.uuid4()


# URL-safe alphabet without ambiguous characters.
_QR_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
QR_TOKEN_LENGTH = 22


def new_uuid() -> uuid.UUID:
    """Return a UUIDv7 (time-ordered) primary key."""

    return _uuid7()


def new_qr_token() -> str:
    """Return a 22-char URL-safe QR token."""

    return _nanoid_generate(_QR_ALPHABET, QR_TOKEN_LENGTH)


def new_invitation_token() -> str:
    """Return a 32-char URL-safe invitation token."""

    return _nanoid_generate(_QR_ALPHABET, 32)
