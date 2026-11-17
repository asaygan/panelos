"""Server-side locale handling (emails + notification text)."""

from __future__ import annotations

SUPPORTED_LOCALES = ("tr", "en")
DEFAULT_LOCALE = "tr"


def normalize_locale(value: str | None, fallback: str = DEFAULT_LOCALE) -> str:
    """Map anything like ``tr-TR`` / ``EN`` to a supported locale code."""

    if not value:
        return fallback
    code = value.strip().lower().replace("_", "-").split("-", 1)[0]
    return code if code in SUPPORTED_LOCALES else fallback
