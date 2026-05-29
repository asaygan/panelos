"""User-management authorization rules: last-owner, self, admin-vs-owner.

These exercise the guard logic in ``membership_service`` without a live DB by
stubbing the few session/repo calls the *guard* paths reach. Every assertion
below targets a ``Forbidden`` raised *before* any audit write, so the stub never
needs to persist anything.
"""

from __future__ import annotations

import uuid

import pytest

from panelos_api.core.exceptions import Forbidden
from panelos_api.core.rbac import Role
from panelos_api.db.models.membership import Membership
from panelos_api.services import membership_service


class _FakeResult:
    def __init__(self, value: object) -> None:
        self._value = value

    def scalar_one_or_none(self) -> object:
        return self._value

    def scalar_one(self) -> object:
        return self._value


class _FakeSession:
    """Minimal async session stub.

    ``get_in_company`` (via MembershipRepo) and ``count_active_owners`` both run
    through ``execute``; we return the membership first, then the owner count.
    """

    def __init__(self, membership: Membership, owner_count: int = 1) -> None:
        self._membership = membership
        self._owner_count = owner_count
        self._calls = 0

    async def execute(self, *_args, **_kwargs):  # type: ignore[no-untyped-def]
        self._calls += 1
        # First execute = repo.get_in_company → membership; later = owner count.
        if self._calls == 1:
            return _FakeResult(self._membership)
        return _FakeResult(self._owner_count)


def _membership(role: Role, *, status: str = "active", user_id: uuid.UUID | None = None) -> Membership:
    return Membership(
        id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        user_id=user_id or uuid.uuid4(),
        role=role,
        status=status,
    )


@pytest.mark.asyncio
async def test_last_owner_cannot_be_removed() -> None:
    owner = _membership(Role.OWNER)
    session = _FakeSession(owner, owner_count=1)
    with pytest.raises(Forbidden):
        await membership_service.remove(
            session,  # type: ignore[arg-type]
            company_id=owner.company_id,
            actor_id=uuid.uuid4(),
            actor_role=Role.OWNER,
            membership_id=owner.id,
        )


@pytest.mark.asyncio
async def test_last_owner_cannot_be_suspended() -> None:
    owner = _membership(Role.OWNER)
    session = _FakeSession(owner, owner_count=1)
    with pytest.raises(Forbidden):
        await membership_service.change_status(
            session,  # type: ignore[arg-type]
            company_id=owner.company_id,
            actor_id=uuid.uuid4(),
            actor_role=Role.OWNER,
            membership_id=owner.id,
            new_status="suspended",
        )


@pytest.mark.asyncio
async def test_last_owner_cannot_be_downgraded() -> None:
    owner = _membership(Role.OWNER)
    session = _FakeSession(owner, owner_count=1)
    with pytest.raises(Forbidden):
        await membership_service.change_role(
            session,  # type: ignore[arg-type]
            company_id=owner.company_id,
            actor_id=uuid.uuid4(),
            actor_role=Role.OWNER,
            membership_id=owner.id,
            new_role=Role.ADMIN,
        )


@pytest.mark.asyncio
async def test_cannot_change_own_role() -> None:
    actor_id = uuid.uuid4()
    admin = _membership(Role.ADMIN, user_id=actor_id)
    session = _FakeSession(admin)
    with pytest.raises(Forbidden):
        await membership_service.change_role(
            session,  # type: ignore[arg-type]
            company_id=admin.company_id,
            actor_id=actor_id,
            actor_role=Role.ADMIN,
            membership_id=admin.id,
            new_role=Role.ENGINEER,
        )


@pytest.mark.asyncio
async def test_cannot_remove_self() -> None:
    actor_id = uuid.uuid4()
    admin = _membership(Role.ADMIN, user_id=actor_id)
    session = _FakeSession(admin)
    with pytest.raises(Forbidden):
        await membership_service.remove(
            session,  # type: ignore[arg-type]
            company_id=admin.company_id,
            actor_id=actor_id,
            actor_role=Role.ADMIN,
            membership_id=admin.id,
        )


@pytest.mark.asyncio
async def test_cannot_suspend_self() -> None:
    actor_id = uuid.uuid4()
    admin = _membership(Role.ADMIN, user_id=actor_id)
    session = _FakeSession(admin)
    with pytest.raises(Forbidden):
        await membership_service.change_status(
            session,  # type: ignore[arg-type]
            company_id=admin.company_id,
            actor_id=actor_id,
            actor_role=Role.ADMIN,
            membership_id=admin.id,
            new_status="suspended",
        )


@pytest.mark.asyncio
async def test_admin_cannot_target_owner() -> None:
    owner = _membership(Role.OWNER)
    session = _FakeSession(owner)
    with pytest.raises(Forbidden):
        await membership_service.change_role(
            session,  # type: ignore[arg-type]
            company_id=owner.company_id,
            actor_id=uuid.uuid4(),
            actor_role=Role.ADMIN,
            membership_id=owner.id,
            new_role=Role.ADMIN,
        )


@pytest.mark.asyncio
async def test_admin_cannot_assign_owner_role() -> None:
    eng = _membership(Role.ENGINEER)
    session = _FakeSession(eng)
    with pytest.raises(Forbidden):
        await membership_service.change_role(
            session,  # type: ignore[arg-type]
            company_id=eng.company_id,
            actor_id=uuid.uuid4(),
            actor_role=Role.ADMIN,
            membership_id=eng.id,
            new_role=Role.OWNER,
        )
