"""Domain errors and RFC 7807 problem+json mappers.

Every error the API returns has the same shape::

    {"type": "...", "title": "...", "status": 409, "detail": "...", "code": "conflict"}

``code`` is a stable machine-readable identifier clients use to pick a
translated message; ``detail`` is an English fallback for logs and tooling.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi.responses import JSONResponse

if TYPE_CHECKING:
    from fastapi import Request

PROBLEM_JSON = "application/problem+json"
_TYPE_BASE = "https://panelos.io/errors/"


class DomainError(Exception):
    """Base class for domain-level errors."""

    status_code: int = 500
    title: str = "Internal Server Error"
    code: str = "internal_error"

    def __init__(self, detail: str = "", *, code: str | None = None, **extra: Any) -> None:
        super().__init__(detail or self.title)
        self.detail = detail or self.title
        if code is not None:
            self.code = code
        self.extra = extra

    @property
    def type_uri(self) -> str:
        return f"{_TYPE_BASE}{self.code.replace('_', '-')}"


class NotFound(DomainError):
    status_code = 404
    title = "Not Found"
    code = "not_found"


class Forbidden(DomainError):
    status_code = 403
    title = "Forbidden"
    code = "forbidden"


class Unauthorized(DomainError):
    status_code = 401
    title = "Unauthorized"
    code = "unauthorized"


class Conflict(DomainError):
    status_code = 409
    title = "Conflict"
    code = "conflict"


class Gone(DomainError):
    status_code = 410
    title = "Gone"
    code = "gone"


class TooManyRequests(DomainError):
    status_code = 429
    title = "Too Many Requests"
    code = "rate_limited"


class ValidationFailed(DomainError):
    status_code = 422
    title = "Validation Failed"
    code = "validation_error"


def problem(status: int, *, title: str, detail: str, code: str, **extra: Any) -> JSONResponse:
    body = {
        "type": f"{_TYPE_BASE}{code.replace('_', '-')}",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        **extra,
    }
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_JSON)


async def domain_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """Render a DomainError as RFC 7807 problem+json."""

    if not isinstance(exc, DomainError):  # pragma: no cover - registered for DomainError only
        return problem(
            500, title="Internal Server Error", detail="unexpected error", code="internal_error"
        )
    return problem(exc.status_code, title=exc.title, detail=exc.detail, code=exc.code, **exc.extra)


async def validation_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """FastAPI/pydantic request validation → same problem shape + field errors."""

    errors = [
        {
            "field": ".".join(str(p) for p in err.get("loc", ()) if p not in ("body", "query")),
            "message": err.get("msg", ""),
            "type": err.get("type", ""),
        }
        for err in getattr(exc, "errors", lambda: [])()
    ]
    return problem(
        422,
        title="Validation Failed",
        detail="request validation failed",
        code="validation_error",
        errors=errors,
    )


_HTTP_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    429: "rate_limited",
}


async def http_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """Starlette/FastAPI HTTPException (unknown route, wrong method, …)."""

    status = int(getattr(exc, "status_code", 500))
    detail = getattr(exc, "detail", None)
    return problem(
        status,
        title=str(detail) if isinstance(detail, str) else "HTTP Error",
        detail=str(detail) if detail else "",
        code=_HTTP_CODES.get(status, "http_error" if status < 500 else "internal_error"),
    )


async def rate_limit_handler(_: Request, exc: Exception) -> JSONResponse:
    return problem(
        429,
        title="Too Many Requests",
        detail="too many requests, try again shortly",
        code="rate_limited",
    )


async def integrity_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """Unique/foreign-key violations that slipped past service checks → 409, not 500."""

    orig = getattr(exc, "orig", None)
    sqlstate = getattr(orig, "sqlstate", None) or getattr(orig, "pgcode", None)
    if sqlstate == "23505":
        return problem(
            409,
            title="Conflict",
            detail="a record with these values already exists",
            code="duplicate",
        )
    if sqlstate == "23503":
        return problem(
            409,
            title="Conflict",
            detail="the record is referenced by other data",
            code="in_use",
        )
    return problem(
        409, title="Conflict", detail="the change conflicts with existing data", code="conflict"
    )


async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """Last resort: never leak internals to the client."""

    from panelos_api.core.logging import get_logger

    get_logger("panelos_api").exception("unhandled_error", error=type(exc).__name__)
    return problem(
        500, title="Internal Server Error", detail="unexpected error", code="internal_error"
    )
