from fastapi import APIRouter
from app.api.v1 import (
    auth,
    endpoints,
    checks,
    incidents,
    alerts,
    analytics,
    reports,
    mock_targets,
    system
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(endpoints.router, prefix="/endpoints", tags=["Endpoint Management"])
api_router.include_router(checks.router, prefix="/checks", tags=["Health Checks & History"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents & Recovery"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts & Rules"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Performance & Uptime Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Exports"])
api_router.include_router(mock_targets.router, prefix="/mock-targets", tags=["Mock Test Targets"])
api_router.include_router(system.router, prefix="/system", tags=["System & Diagnostic"])
