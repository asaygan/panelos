"""Password reset/change, MFA lifecycle, profile and the unified error shape."""

from __future__ import annotations

import re

import pyotp
import pytest

API = "/api/v1"


async def _login(app_client, email, password, **extra):  # type: ignore[no-untyped-def]
    return await app_client.post(
        f"{API}/auth/login", json={"email": email, "password": password, **extra}
    )


@pytest.mark.asyncio
async def test_password_reset_flow(app_client, seed_owner, outbox_mail) -> None:  # type: ignore[no-untyped-def]
    email = seed_owner["email"]
    old = await _login(app_client, email, seed_owner["password"])
    old_refresh = old.json()["refresh_token"]

    # Unknown addresses get the same answer and no mail (no account enumeration).
    r = await app_client.post(f"{API}/auth/forgot-password", json={"email": "nobody@x.io"})
    assert r.status_code == 202
    assert await outbox_mail.settle() == []

    r = await app_client.post(f"{API}/auth/forgot-password", json={"email": email})
    assert r.status_code == 202
    mails = await outbox_mail.settle()
    assert len(mails) == 1 and mails[0].to == email
    assert "Parolanızı sıfırlayın" in mails[0].text  # default locale is Turkish
    token = re.search(r"token=([\w-]+)", mails[0].text).group(1)  # type: ignore[union-attr]

    r = await app_client.post(
        f"{API}/auth/reset-password", json={"token": token, "password": "short"}
    )
    assert r.status_code == 422 and r.json()["code"] == "weak_password"

    new_password = "BrandNewPass456!"
    r = await app_client.post(
        f"{API}/auth/reset-password", json={"token": token, "password": new_password}
    )
    assert r.status_code == 200, r.text
    # One-time: the link is dead afterwards.
    r = await app_client.post(
        f"{API}/auth/reset-password", json={"token": token, "password": "AnotherPass789!"}
    )
    assert r.status_code == 422 and r.json()["code"] == "invalid_reset_token"

    assert (await _login(app_client, email, seed_owner["password"])).status_code == 401
    assert (await _login(app_client, email, new_password)).status_code == 200
    # Every session that existed before the reset is revoked.
    r = await app_client.post(f"{API}/auth/refresh", json={"refresh_token": old_refresh})
    assert r.status_code == 401
    # ...and the user is told their password changed.
    assert any("değiştirildi" in m.subject for m in await outbox_mail.settle())


@pytest.mark.asyncio
async def test_change_password(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = {"Authorization": owner_auth["headers"]["Authorization"]}
    seed = owner_auth["seed"]
    r = await app_client.post(
        f"{API}/auth/change-password",
        json={"current_password": "wrong", "new_password": "BrandNewPass456!"},
        headers=h,
    )
    assert r.status_code == 401 and r.json()["code"] == "wrong_password"
    r = await app_client.post(
        f"{API}/auth/change-password",
        json={"current_password": seed["password"], "new_password": "BrandNewPass456!"},
        headers=h,
    )
    assert r.status_code == 200, r.text
    assert (await _login(app_client, seed["email"], "BrandNewPass456!")).status_code == 200
    r = await app_client.post(
        f"{API}/auth/refresh", json={"refresh_token": owner_auth["tokens"]["refresh_token"]}
    )
    assert r.status_code == 401  # other sessions were signed out


@pytest.mark.asyncio
async def test_mfa_lifecycle(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = {"Authorization": owner_auth["headers"]["Authorization"]}
    seed = owner_auth["seed"]

    r = await app_client.post(f"{API}/auth/mfa/setup", headers=h)
    assert r.status_code == 200, r.text
    secret = r.json()["secret"]
    # Starting setup must NOT lock the account: login still works without a code.
    assert (await _login(app_client, seed["email"], seed["password"])).status_code == 200

    r = await app_client.post(f"{API}/auth/mfa/enable", json={"code": "000000"}, headers=h)
    assert r.status_code == 422 and r.json()["code"] == "invalid_mfa_code"
    r = await app_client.post(
        f"{API}/auth/mfa/enable", json={"code": pyotp.TOTP(secret).now()}, headers=h
    )
    assert r.status_code == 200, r.text
    recovery = r.json()["recovery_codes"]
    assert len(recovery) == 10

    r = await _login(app_client, seed["email"], seed["password"])
    assert r.status_code == 401 and r.json()["code"] == "mfa_required"
    r = await _login(app_client, seed["email"], seed["password"], mfa_code="123456")
    assert r.status_code == 401 and r.json()["code"] == "invalid_mfa_code"
    r = await _login(app_client, seed["email"], seed["password"], mfa_code=pyotp.TOTP(secret).now())
    assert r.status_code == 200

    # A recovery code works exactly once.
    assert (
        await _login(app_client, seed["email"], seed["password"], mfa_code=recovery[0])
    ).status_code == 200
    assert (
        await _login(app_client, seed["email"], seed["password"], mfa_code=recovery[0])
    ).status_code == 401

    me = (await app_client.get(f"{API}/auth/me", headers=h)).json()
    assert me["mfa_enabled"] is True

    r = await app_client.post(f"{API}/auth/mfa/disable", json={"password": "nope"}, headers=h)
    assert r.status_code == 401
    r = await app_client.post(
        f"{API}/auth/mfa/disable", json={"password": seed["password"]}, headers=h
    )
    assert r.status_code == 200
    assert (await _login(app_client, seed["email"], seed["password"])).status_code == 200


@pytest.mark.asyncio
async def test_me_profile_and_permissions(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = owner_auth["headers"]
    me = (await app_client.get(f"{API}/auth/me", headers=h)).json()
    assert me["role"] == "owner" and "manage_org" in me["permissions"]
    assert me["companies"][0]["name"] == "Acme Manufacturing"
    assert me["locale"] == "tr"

    r = await app_client.patch(
        f"{API}/auth/me",
        json={
            "name": "Olivia O.",
            "locale": "en",
            "notification_prefs": {"email": {"issue_reported": False}},
        },
        headers=h,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["name"], body["locale"]) == ("Olivia O.", "en")
    assert body["notification_prefs"]["email"]["issue_reported"] is False
    r = await app_client.patch(f"{API}/auth/me", json={"locale": "xx"}, headers=h)
    assert r.status_code == 422 and r.json()["code"] == "unsupported_locale"


@pytest.mark.asyncio
async def test_errors_share_one_shape(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = owner_auth["headers"]
    cases = [
        (await app_client.get(f"{API}/nope"), 404, "not_found"),
        (await app_client.get(f"{API}/panels"), 401, "unauthorized"),
        (await app_client.post(f"{API}/panels", json={}, headers=h), 422, "validation_error"),
        (await app_client.get(f"{API}/panels/not-a-uuid", headers=h), 422, "validation_error"),
    ]
    for r, status, code in cases:
        assert r.status_code == status, r.text
        assert r.headers["content-type"].startswith("application/problem+json")
        body = r.json()
        assert body["code"] == code and body["status"] == status and "title" in body

    # A duplicate serial is a 409 with a machine-readable code, not a 500.
    payload = {"tag": "D-1", "serial": "DUP-1", "name": "dup"}
    assert (await app_client.post(f"{API}/panels", json=payload, headers=h)).status_code == 201
    r = await app_client.post(f"{API}/panels", json=payload, headers=h)
    assert r.status_code == 409 and r.json()["code"] == "duplicate"


@pytest.mark.asyncio
async def test_readiness_probe(app_client) -> None:  # type: ignore[no-untyped-def]
    r = await app_client.get(f"{API}/health/ready")
    assert r.status_code == 200 and r.json()["checks"]["database"] == "ok"
