"""Shared lifecycle status enum.

The 7-stage industrial asset lifecycle. Used by Project and System Group; not
by Panel (PanelOS is asset management, not SCADA — panels carry no
operational/runtime status).
"""

from __future__ import annotations

from enum import StrEnum


class LifecycleStatus(StrEnum):
    """draft → engineering → released → installed → commissioned → in_service → archived.

    Free transitions are allowed; every change is audited and written to the
    matching history table (project_status_history / group_status_history).
    """

    DRAFT = "draft"
    ENGINEERING = "engineering"
    RELEASED = "released"
    INSTALLED = "installed"
    COMMISSIONED = "commissioned"
    IN_SERVICE = "in_service"
    ARCHIVED = "archived"
