"""Role-based access control matrix.

Mirrors plan section 9. Single source of truth: ``ROLE_PERMISSIONS``.
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
    CRUD_PANELS = "crud_panels"
    CREATE_REVISION = "create_revision"
    APPROVE_REVISION = "approve_revision"
    UPLOAD_PDF = "upload_pdf"
    GENERATE_LABELS = "generate_labels"
    SCAN_QR = "scan_qr"
    REPORT_ISSUE = "report_issue"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.OWNER: frozenset(Permission),
    Role.ADMIN: frozenset(
        {
            Permission.MANAGE_USERS,
            Permission.CRUD_PANELS,
            Permission.CREATE_REVISION,
            Permission.APPROVE_REVISION,
            Permission.UPLOAD_PDF,
            Permission.GENERATE_LABELS,
            Permission.SCAN_QR,
            Permission.REPORT_ISSUE,
        }
    ),
    Role.ENGINEER: frozenset(
        {
            Permission.CRUD_PANELS,
            Permission.CREATE_REVISION,
            Permission.APPROVE_REVISION,  # togglable per org; default allowed.
            Permission.UPLOAD_PDF,
            Permission.GENERATE_LABELS,
            Permission.SCAN_QR,
            Permission.REPORT_ISSUE,
        }
    ),
    Role.TECHNICIAN: frozenset(
        {
            Permission.SCAN_QR,
            Permission.REPORT_ISSUE,
        }
    ),
    Role.VIEWER: frozenset({Permission.SCAN_QR}),
}


def has_permission(role: Role, perm: Permission) -> bool:
    """Return True when ``role`` is granted ``perm``."""

    return perm in ROLE_PERMISSIONS[role]


# ---------------------------------------------------------------------------
# Display / contract catalog (additive — powers GET /roles + Permission Matrix).
# NOT used for runtime gating; that stays with ``Permission`` + ``ROLE_PERMISSIONS``.
# ---------------------------------------------------------------------------

# Ordered list of (key, label, description) for the spec's 21 permission keys.
PERMISSION_CATALOG: list[tuple[str, str, str]] = [
    ("full_access", "Full Access", "Unrestricted access to every feature and setting."),
    ("manage_billing", "Manage Billing", "View invoices and manage the subscription and payment methods."),
    ("manage_organization", "Manage Organization", "Edit company profile, standards, locations and branding."),
    ("manage_users", "Manage Users", "Invite, change roles, suspend, and remove members."),
    ("manage_roles", "Manage Roles", "Define and assign roles and permission sets."),
    ("manage_panels", "Manage Panels", "Create, edit, and archive panels."),
    ("manage_revisions", "Manage Revisions", "Create, edit, and manage schematic revisions."),
    ("approve_revisions", "Approve Revisions", "Review and approve or reject submitted revisions."),
    ("generate_labels", "Generate Labels", "Render and export panel labels."),
    ("view_audit_logs", "View Audit Logs", "Read the organization's audit trail."),
    ("create_panels", "Create Panels", "Add new panels to the organization."),
    ("edit_panels", "Edit Panels", "Modify existing panel details."),
    ("upload_revisions", "Upload Revisions", "Upload schematic PDFs to revisions."),
    ("create_revisions", "Create Revisions", "Start new revision drafts."),
    ("view_panels", "View Panels", "Browse panels and their metadata."),
    ("view_schematics", "View Schematics", "Open schematic sheets and drawings."),
    ("view_approved_revisions", "View Approved Revisions", "Read released, approved revisions."),
    ("download_pdfs", "Download PDFs", "Download schematic and label PDFs."),
    ("scan_qr", "Scan QR Codes", "Scan panel QR codes in the field."),
    ("report_issues", "Report Issues", "Flag faults or issues on panels."),
    ("offline_access", "Offline Access", "Access cached panels and schematics offline."),
]

# Source of truth for GET /roles + the Permission Matrix (display/contract only).
ROLE_CATALOG: dict[Role, list[str]] = {
    Role.OWNER: [key for key, _, _ in PERMISSION_CATALOG],
    Role.ADMIN: [
        "manage_organization",
        "manage_users",
        "manage_roles",
        "manage_panels",
        "manage_revisions",
        "approve_revisions",
        "generate_labels",
        "view_audit_logs",
        "create_panels",
        "edit_panels",
        "upload_revisions",
        "create_revisions",
        "view_panels",
        "view_schematics",
        "view_approved_revisions",
        "download_pdfs",
        "scan_qr",
        "report_issues",
        "offline_access",
    ],
    Role.ENGINEER: [
        "manage_panels",
        "manage_revisions",
        "approve_revisions",
        "generate_labels",
        "create_panels",
        "edit_panels",
        "upload_revisions",
        "create_revisions",
        "view_panels",
        "view_schematics",
        "view_approved_revisions",
        "download_pdfs",
        "scan_qr",
        "report_issues",
        "offline_access",
    ],
    Role.TECHNICIAN: [
        "view_panels",
        "view_approved_revisions",
        "download_pdfs",
        "scan_qr",
        "report_issues",
        "offline_access",
    ],
    Role.VIEWER: [
        "view_panels",
        "view_approved_revisions",
        "scan_qr",
    ],
}

ROLE_LABELS: dict[Role, str] = {
    Role.OWNER: "Owner",
    Role.ADMIN: "Admin",
    Role.ENGINEER: "Engineer",
    Role.TECHNICIAN: "Technician",
    Role.VIEWER: "Viewer",
}
