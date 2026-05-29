"""RBAC permission matrix coverage."""

from __future__ import annotations

import pytest

from panelos_api.core.rbac import Permission, Role, has_permission


@pytest.mark.parametrize(
    "role,perm,expected",
    [
        (Role.OWNER, Permission.MANAGE_ORG, True),
        (Role.OWNER, Permission.MANAGE_USERS, True),
        (Role.OWNER, Permission.CRUD_PANELS, True),
        (Role.OWNER, Permission.APPROVE_REVISION, True),
        (Role.ADMIN, Permission.MANAGE_ORG, False),
        (Role.ADMIN, Permission.MANAGE_USERS, True),
        (Role.ADMIN, Permission.CRUD_PANELS, True),
        (Role.ENGINEER, Permission.MANAGE_USERS, False),
        (Role.ENGINEER, Permission.CRUD_PANELS, True),
        (Role.ENGINEER, Permission.CREATE_REVISION, True),
        (Role.ENGINEER, Permission.APPROVE_REVISION, True),
        (Role.ENGINEER, Permission.UPLOAD_PDF, True),
        (Role.TECHNICIAN, Permission.CRUD_PANELS, False),
        (Role.TECHNICIAN, Permission.SCAN_QR, True),
        (Role.TECHNICIAN, Permission.REPORT_ISSUE, True),
        (Role.VIEWER, Permission.SCAN_QR, True),
        (Role.VIEWER, Permission.CRUD_PANELS, False),
        (Role.VIEWER, Permission.REPORT_ISSUE, False),
        (Role.VIEWER, Permission.MANAGE_USERS, False),
    ],
)
def test_matrix(role: Role, perm: Permission, expected: bool) -> None:
    assert has_permission(role, perm) is expected


def test_owner_has_all_permissions() -> None:
    for perm in Permission:
        assert has_permission(Role.OWNER, perm)
