"""Invite → accept-invite onboarding against a real Postgres container.

Covers: an owner invites a member, the public invitation lookup resolves the
token, accepting it sets a password + activates the membership (auto-login), and
the new user can subsequently log in independently.
"""

from __future__ import annotations

import asyncio

import pytest

API = "/api/v1"


@pytest.mark.asyncio
async def test_invite_then_accept_then_login(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    invitee = "newhire@acmeco.io"

    # Owner invites a member.
    r = await app_client.post(
        f"{API}/users/invitations",
        json={"email": invitee, "role": "engineer"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    inv = r.json()
    token = inv["token"]
    assert inv["email"] == invitee
    assert inv["role"] == "engineer"

    # Public invitation lookup resolves the token (the accept page uses this).
    r = await app_client.get(f"{API}/auth/invitations/{token}")
    assert r.status_code == 200, r.text
    info = r.json()
    assert info["email"] == invitee
    assert info["company_name"] == "Acme Manufacturing"
    assert info["accepted"] is False
    assert info["expired"] is False

    # Accept: set password + name → activates membership, returns login tokens.
    r = await app_client.post(
        f"{API}/auth/accept-invite",
        json={"token": token, "name": "New Hire", "password": "NewHirePass123!"},
    )
    assert r.status_code == 200, r.text
    tokens = r.json()
    assert tokens["access_token"] and tokens["refresh_token"]

    # The auto-login token resolves /auth/me as the new active member.
    r = await app_client.get(
        f"{API}/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["email"] == invitee
    assert me["companies"][0]["role"] == "engineer"

    # The token is now marked accepted (idempotency / re-use guard).
    r = await app_client.get(f"{API}/auth/invitations/{token}")
    assert r.json()["accepted"] is True

    # The new user can log in independently with the password they set.
    r = await app_client.post(
        f"{API}/auth/login", json={"email": invitee, "password": "NewHirePass123!"}
    )
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_accept_invalid_token_404(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/auth/accept-invite",
        json={"token": "nope-not-real", "password": "Whatever123!"},
    )
    assert r.status_code == 404, r.text
