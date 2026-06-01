"""Auth signup/login/me/refresh/logout against a real Postgres container.

Covers cookie + Bearer auth, refresh rotation, and logout revocation.
"""

from __future__ import annotations

import pytest

API = "/api/v1"


@pytest.mark.asyncio
async def test_login_me_refresh_logout(app_client, seed_owner) -> None:  # type: ignore[no-untyped-def]
    email = seed_owner["email"]
    password = seed_owner["password"]

    # Login → tokens.
    r = await app_client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    tokens = r.json()
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]
    assert access and refresh

    # /auth/me with Bearer.
    r = await app_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["email"] == email
    assert me["companies"][0]["role"] == "owner"

    # /auth/me with cookie instead of Bearer.
    app_client.cookies.set("panelos_session", access)
    r = await app_client.get(f"{API}/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["email"] == email
    app_client.cookies.delete("panelos_session")

    # Refresh rotates tokens. Refresh JWTs carry a per-token `jti` nonce, so two
    # rotations in the same wall-clock second no longer collide on token_hash.
    r = await app_client.post(f"{API}/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200, r.text
    new_tokens = r.json()
    assert new_tokens["refresh_token"] != refresh

    # Old refresh token is now revoked (one-time use).
    r = await app_client.post(f"{API}/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 401, r.text

    # Logout revokes the new refresh token.
    r = await app_client.post(
        f"{API}/auth/logout", json={"refresh_token": new_tokens["refresh_token"]}
    )
    assert r.status_code == 200, r.text
    r = await app_client.post(
        f"{API}/auth/refresh", json={"refresh_token": new_tokens["refresh_token"]}
    )
    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_refresh_via_cookie_and_logout(app_client, seed_owner) -> None:  # type: ignore[no-untyped-def]
    """Browser flow: refresh token comes from the panelos_refresh cookie (no body)."""
    r = await app_client.post(
        f"{API}/auth/login",
        json={"email": seed_owner["email"], "password": seed_owner["password"]},
    )
    assert r.status_code == 200, r.text
    refresh = r.json()["refresh_token"]

    # Simulate the httpOnly cookie the Next.js server action sets; send NO body.
    app_client.cookies.set("panelos_refresh", refresh)
    r = await app_client.post(f"{API}/auth/refresh")
    assert r.status_code == 200, r.text
    rotated = r.json()
    assert rotated["refresh_token"] != refresh
    # The endpoint rotates both auth cookies so the browser session continues.
    assert "panelos_session" in r.cookies
    assert "panelos_refresh" in r.cookies

    # Logout with no body uses the refresh cookie, revokes it, and clears cookies.
    app_client.cookies.set("panelos_refresh", rotated["refresh_token"])
    r = await app_client.post(f"{API}/auth/logout")
    assert r.status_code == 200, r.text
    # Revoked: the rotated refresh token no longer works.
    r = await app_client.post(
        f"{API}/auth/refresh", json={"refresh_token": rotated["refresh_token"]}
    )
    assert r.status_code == 401, r.text
    app_client.cookies.delete("panelos_refresh")


@pytest.mark.asyncio
async def test_refresh_without_token_401(app_client) -> None:  # type: ignore[no-untyped-def]
    """No body and no cookie → 401, not a 422 validation error."""
    r = await app_client.post(f"{API}/auth/refresh")
    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_protected_route_requires_auth(app_client, seed_owner) -> None:  # type: ignore[no-untyped-def]
    r = await app_client.get(f"{API}/auth/me")
    assert r.status_code == 401, r.text

    r = await app_client.post(
        f"{API}/auth/login",
        json={"email": seed_owner["email"], "password": "wrong-password"},
    )
    assert r.status_code == 401, r.text


@pytest.mark.asyncio
async def test_health_ok(app_client) -> None:  # type: ignore[no-untyped-def]
    r = await app_client.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
