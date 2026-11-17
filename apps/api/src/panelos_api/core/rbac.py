"""Role-based access control.

``Permission`` + ``ROLE_PERMISSIONS`` are the single source of truth: routers
gate on them and ``GET /roles`` (the permission matrix in the UI) is generated
from them, so what the UI shows is exactly what the API enforces.
"""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    """User role within a company (membership-scoped)."""

    OWNER = "owner"
    ADMIN = "admin"
    ENGINEER = "engineer"
    TECHNICIAN = "technician"
    VIEWER = "viewer"


class Permission(StrEnum):
    """Discrete capabilities checked by routers/services."""

    MANAGE_ORG = "manage_org"
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT = "view_audit"
    CRUD_PANELS = "crud_panels"
    CREATE_REVISION = "create_revision"
    APPROVE_REVISION = "approve_revision"
    UPLOAD_PDF = "upload_pdf"
    GENERATE_LABELS = "generate_labels"
    MANAGE_MAINTENANCE = "manage_maintenance"
    MANAGE_ISSUES = "manage_issues"
    REPORT_ISSUE = "report_issue"
    EXPORT_DATA = "export_data"
    SCAN_QR = "scan_qr"


_ENGINEER = frozenset(
    {
        Permission.CRUD_PANELS,
        Permission.CREATE_REVISION,
        # Subject to the company's approval policy (engineer_can_approve).
        Permission.APPROVE_REVISION,
        Permission.UPLOAD_PDF,
        Permission.GENERATE_LABELS,
        Permission.MANAGE_MAINTENANCE,
        Permission.MANAGE_ISSUES,
        Permission.REPORT_ISSUE,
        Permission.EXPORT_DATA,
        Permission.SCAN_QR,
    }
)

ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.OWNER: frozenset(Permission),
    Role.ADMIN: _ENGINEER | {Permission.MANAGE_USERS, Permission.VIEW_AUDIT},
    Role.ENGINEER: _ENGINEER,
    # Field staff: read, scan, report faults and log the maintenance they did.
    Role.TECHNICIAN: frozenset(
        {Permission.SCAN_QR, Permission.REPORT_ISSUE, Permission.MANAGE_MAINTENANCE}
    ),
    Role.VIEWER: frozenset({Permission.SCAN_QR}),
}


def has_permission(role: Role, perm: Permission) -> bool:
    """Return True when ``role`` is granted ``perm``."""

    return perm in ROLE_PERMISSIONS[role]


def permissions_for(role: Role) -> list[str]:
    """Permission keys granted to ``role``, in catalog order."""

    return [p.value for p in Permission if p in ROLE_PERMISSIONS[role]]


# (key, English label, English description). Clients translate by key; the
# English text is the fallback and what API consumers see.
PERMISSION_CATALOG: list[tuple[str, str, str]] = [
    (Permission.MANAGE_ORG, "Manage organization", "Company profile, policies and locations."),
    (Permission.MANAGE_USERS, "Manage users", "Invite, change roles, suspend and remove members."),
    (Permission.VIEW_AUDIT, "View audit log", "Read and export the organization's audit trail."),
    (Permission.CRUD_PANELS, "Manage panels", "Create, edit, move and archive assets."),
    (Permission.CREATE_REVISION, "Create revisions", "Start drafts, edit BOM, submit for review."),
    (Permission.APPROVE_REVISION, "Approve revisions", "Approve or reject submitted revisions."),
    (Permission.UPLOAD_PDF, "Upload schematics", "Upload schematic PDFs and manage sheets."),
    (Permission.GENERATE_LABELS, "Generate labels", "Render and export QR labels."),
    (Permission.MANAGE_MAINTENANCE, "Log maintenance", "Record maintenance and manage plans."),
    (Permission.MANAGE_ISSUES, "Manage issues", "Assign, update and close reported issues."),
    (Permission.REPORT_ISSUE, "Report issues", "Report a fault on a panel from the field."),
    (Permission.EXPORT_DATA, "Import & export", "Bulk import panels and export data."),
    (Permission.SCAN_QR, "View & scan", "Browse panels, open approved schematics, scan QR."),
]

ROLE_CATALOG: dict[Role, list[str]] = {role: permissions_for(role) for role in Role}

ROLE_LABELS: dict[Role, str] = {
    Role.OWNER: "Owner",
    Role.ADMIN: "Admin",
    Role.ENGINEER: "Engineer",
    Role.TECHNICIAN: "Technician",
    Role.VIEWER: "Viewer",
}
