"""Symmetric encryption for small secrets stored in the database (TOTP seeds)."""

from __future__ import annotations

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from panelos_api.config import get_settings

_PREFIX = "enc:v1:"


@lru_cache(maxsize=2)
def _fernet(material: str) -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(material.encode("utf-8")).digest())
    return Fernet(key)


def _f() -> Fernet:
    s = get_settings()
    return _fernet(s.DATA_ENCRYPTION_KEY or f"panelos-data:{s.JWT_SECRET}")


def encrypt(plaintext: str) -> str:
    return _PREFIX + _f().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt(stored: str) -> str:
    """Decrypt a value written by :func:`encrypt`.

    Values without the prefix are legacy plaintext rows and are returned as-is.
    """

    if not stored.startswith(_PREFIX):
        return stored
    try:
        return _f().decrypt(stored[len(_PREFIX) :].encode("ascii")).decode("utf-8")
    except InvalidToken as exc:  # key rotated or data corrupted
        raise ValueError("stored secret cannot be decrypted") from exc
