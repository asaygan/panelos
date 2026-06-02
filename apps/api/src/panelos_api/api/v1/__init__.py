"""API v1 router aggregation."""

from fastapi import APIRouter

from panelos_api.api.v1.routers import (
    audit_logs,
    auth,
    cabinets,
    companies,
    components,
    files,
    health,
    label_templates,
    labels,
    panels,
    projects,
    qr,
    revisions,
    search,
    users,
    webhooks,
)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(companies.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(users.roles_router)
api_v1_router.include_router(audit_logs.router)
api_v1_router.include_router(projects.router)
api_v1_router.include_router(projects.groups_router)
api_v1_router.include_router(panels.router)
api_v1_router.include_router(cabinets.router)
api_v1_router.include_router(revisions.router)
api_v1_router.include_router(components.router)
api_v1_router.include_router(files.router)
api_v1_router.include_router(qr.router)
api_v1_router.include_router(labels.router)
api_v1_router.include_router(label_templates.router)
api_v1_router.include_router(search.router)
api_v1_router.include_router(webhooks.router)

__all__ = ["api_v1_router"]
