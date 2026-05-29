"""Generic inbound webhook stub with HMAC verification."""

from __future__ import annotations

import hashlib
import hmac

from fastapi import APIRouter, Header, HTTPException, Request

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify(secret: str, body: bytes, signature: str) -> bool:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


@router.post("/{hook_id}")
async def inbound(
    hook_id: str,
    request: Request,
    x_signature: str | None = Header(default=None, alias="X-Signature"),
) -> dict[str, str]:
    body = await request.body()
    secret = "TODO-load-from-db"
    if x_signature and not _verify(secret, body, x_signature):
        raise HTTPException(status_code=401, detail="invalid signature")
    return {"hook_id": hook_id, "received": str(len(body))}
