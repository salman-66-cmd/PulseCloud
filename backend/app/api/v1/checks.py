import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.endpoint import Endpoint
from app.models.check import CheckResult
from app.schemas.check import CheckResultResponse, CheckHistoryPaginated

router = APIRouter()


@router.get("", response_model=CheckHistoryPaginated)
def get_checks(
    endpoint_id: Optional[int] = None,
    outcome: Optional[str] = None,
    is_success: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve historical monitoring check records with pagination and filtering."""
    query = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id)

    if current_user.role != "admin":
        query = query.filter(Endpoint.user_id == current_user.id)

    if endpoint_id:
        query = query.filter(CheckResult.endpoint_id == endpoint_id)

    if outcome:
        query = query.filter(CheckResult.outcome == outcome)

    if is_success is not None:
        query = query.filter(CheckResult.is_success == is_success)

    total = query.count()
    pages = math.ceil(total / limit) if total > 0 else 1
    offset = (page - 1) * limit

    items = query.order_by(CheckResult.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages
    }


@router.get("/{check_id}", response_model=CheckResultResponse)
def get_check_detail(
    check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve detailed information about a single check execution."""
    check = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.id == check_id).first()
    if not check:
        raise HTTPException(status_code=404, detail="Check result not found")
    if current_user.role != "admin" and check.endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this check")
    return check


@router.get("/endpoints/{endpoint_id}/checks", response_model=CheckHistoryPaginated)
def get_endpoint_checks(
    endpoint_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Convenience endpoint to retrieve check results for a specific endpoint."""
    return get_checks(
        endpoint_id=endpoint_id,
        page=page,
        limit=limit,
        db=db,
        current_user=current_user
    )
