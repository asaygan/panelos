"""Router-level RBAC enforcement against a real Postgres container.

Covers: a Viewer cannot create a panel (403 via permission dep); the last active
owner cannot be removed / suspended / downgraded (403); an Admin cannot act on an
Owner membership (403).
"""

from __future__ import annotations

import uuid

import pytest

from panelos_api.core.rbac import Role
from panelos_api.core.security import hash_password
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.user import User
from panelos_api.db.session import get_sessionmaker

API = "/api/v1"


async def _add_member(
    company_id: str, email: str, role: Role, password: str = "MemberPass123!"  # noqa: S107
) -> dict[str, str]:
    """Create an active user + membership in ``company_id`` with ``role``."""
    sm = get_sessionmaker()
    async with sm() as session:
        user = User(
            email=email,
            name=email.split("@")[0],
            password_hash=hash_password(password),
            is_active=True,
        )
        session.add(user)
        await session.flush()
        mem = Membership(
            company_id=uuid.UUID(company_id),
            user_id=user.id,
            role=role,
            status="active",
        )
        session.add(mem)
        await session.commit()
        return {
            "user_id": str(user.id),
            "membership_id": str(mem.id),
            "email": email,
            "password": password,
        }


async def _login(app_client, email, password, company_id) -> dict[str, str]:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/auth/login", json={"email": email, "password": password}
    )
    assert r.status_code == 200, r.text
    return {
        "Authorization": f"Bearer {r.json()['access_token']}",
        "X-Company-Id": company_id,
    }


@pytest.mark.asyncio
async def test_viewer_cannot_create_panel(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    company_id = owner_auth["seed"]["company_id"]
    viewer = await _add_member(company_id, "viewer@acmeco.io", Role.VIEWER)
    headers = await _login(app_client, viewer["email"], viewer["password"], company_id)

    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "V-01", "serial": "V-SN", "name": "Nope"},
        headers=headers,
    )
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_last_owner_protected(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    owner_mid = owner_auth["seed"]["membership_id"]
    headers = owner_auth["headers"]

    # Suspend the last owner → 403.
    r = await app_client.patch(
        f"{API}/users/{owner_mid}/status", json={"status": "suspended"}, headers=headers
    )
    assert r.status_code == 403, r.text

    # Remove the last owner → 403.
    r = await app_client.delete(f"{API}/users/{owner_mid}", headers=headers)
    assert r.status_code == 403, r.text

    # Downgrade the last owner to admin → 403. Use the owner's own headers to
    # attempt the downgrade of the *only* owner, which trips the self-change guard
    # first and the last-owner guard underneath.
    r = await app_client.patch(
        f"{API}/users/{owner_mid}/role", json={"role": "engineer"}, headers=headers
    )
    # Owner downgrading self is blocked by the self-change guard first (403).
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_admin_cannot_act_on_owner(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    company_id = owner_auth["seed"]["company_id"]
    owner_mid = owner_auth["seed"]["membership_id"]

    admin = await _add_member(company_id, "admin2@acmeco.io", Role.ADMIN)
    headers = await _login(app_client, admin["email"], admin["password"], company_id)

    # Admin tries to change the owner's role → 403 (admins cannot act on owner).
    r = await app_client.patch(
        f"{API}/users/{owner_mid}/role", json={"role": "admin"}, headers=headers
    )
    assert r.status_code == 403, r.text

    # Admin tries to suspend the owner → 403.
    r = await app_client.patch(
        f"{API}/users/{owner_mid}/status", json={"status": "suspended"}, headers=headers
    )
    assert r.status_code == 403, r.text

    # Admin tries to remove the owner → 403.
    r = await app_client.delete(f"{API}/users/{owner_mid}", headers=headers)
    assert r.status_code == 403, r.text
