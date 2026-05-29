"""Domain errors and RFC 7807 problem+json mappers."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi.responses import JSONResponse

if TYPE_CHECKING:
    from fastapi import Request


class DomainError(Exception):
    """Base class for domain-level errors."""

    status_code: int = 500
    title: str = "Internal Server Error"
    type_uri: str = "about:blank"

    def __init__(self, detail: str = "", **extra: Any) -> None:
        super().__init__(detail or self.title)
        self.detail = detail or self.title
        self.extra = extra


class NotFound(DomainError):
    status_code = 404
    title = "Not Found"
    type_uri = "https://panelos.app/errors/not-found"


class Forbidden(DomainError):
    status_code = 403
    title = "Forbidden"
    type_uri = "https://panelos.app/errors/forbidden"


class Unauthorized(DomainError):
    status_code = 401
    title = "Unauthorized"
    type_uri = "https://panelos.app/errors/unauthorized"


class Conflict(DomainError):
    status_code = 409
    title = "Conflict"
    type_uri = "https://panelos.app/errors/conflict"


class ValidationFailed(DomainError):
    status_code = 422
    title = "Validation Failed"
    type_uri = "https://panelos.app/errors/validation"


async def domain_error_handler(_: Request, exc: Exception) -> JSONResponse:
    """Render a DomainError as RFC 7807 problem+json."""

    if not isinstance(exc, DomainError):
        body = {
            "type": "about:blank",
            "title": "Internal Server Error",
            "status": 500,
            "detail": str(exc),
        }
        return JSONResponse(status_code=500, content=body, media_type="application/problem+json")

    body = {
        "type": exc.type_uri,
        "title": exc.title,
        "status": exc.status_code,
        "detail": exc.detail,
        **exc.extra,
    }
    return JSONResponse(
        status_code=exc.status_code, content=body, media_type="application/problem+json"
    )
