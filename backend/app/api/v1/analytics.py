from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.endpoint import Endpoint
from app.models.check import CheckResult
from app.schemas.analytics import (
    OverviewSummaryResponse,
    LatencyPercentilesResponse,
    StatusCodeDistributionItem
)
from app.services.analytics import (
    get_overview_summary,
    get_uptime_metrics,
    get_status_code_distribution,
    calculate_percentiles,
    get_latency_timeline
)

router = APIRouter()


@router.get("/summary", response_model=OverviewSummaryResponse)
def get_summary(
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get high-level overview metrics across all user's endpoints."""
    uid = None if current_user.role == "admin" else current_user.id
    return get_overview_summary(db, user_id=uid, hours=hours)


@router.get("/uptime")
def get_uptime(
    endpoint_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get calculated uptime metrics for a given time window."""
    uid = None if current_user.role == "admin" else current_user.id
    return get_uptime_metrics(db, endpoint_id=endpoint_id, user_id=uid, hours=hours)


@router.get("/latency", response_model=LatencyPercentilesResponse)
def get_latency(
    endpoint_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get latency percentiles (min, max, avg, median, p95, p99) and statistical reliability."""
    uid = None if current_user.role == "admin" else current_user.id
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    query = db.query(CheckResult.duration_ms).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.timestamp >= since)
    if endpoint_id:
        query = query.filter(CheckResult.endpoint_id == endpoint_id)
    elif uid:
        query = query.filter(Endpoint.user_id == uid)

    durations = [r[0] for r in query.all()]
    return calculate_percentiles(durations)


@router.get("/status-codes", response_model=List[StatusCodeDistributionItem])
def get_status_codes(
    endpoint_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get HTTP status code distribution percentages."""
    uid = None if current_user.role == "admin" else current_user.id
    return get_status_code_distribution(db, endpoint_id=endpoint_id, user_id=uid, hours=hours)


@router.get("/timeline")
def get_timeline(
    endpoint_id: Optional[int] = None,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get time-series latency and error points for interactive charts."""
    uid = None if current_user.role == "admin" else current_user.id
    return get_latency_timeline(db, endpoint_id=endpoint_id, user_id=uid, hours=hours)
