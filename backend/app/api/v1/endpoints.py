from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.ssrf import validate_url_safety
from app.models.user import User
from app.models.endpoint import Endpoint
from app.schemas.endpoint import EndpointCreate, EndpointUpdate, EndpointResponse
from app.schemas.check import CheckResultResponse
from app.services.monitoring import execute_http_check
from app.services.evaluator import evaluate_and_record_check

router = APIRouter()


@router.get("", response_model=List[EndpointResponse])
def get_endpoints(
    search: Optional[str] = None,
    environment: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve list of monitored endpoints for current user with filtering."""
    query = db.query(Endpoint)
    if current_user.role != "admin":
        query = query.filter(Endpoint.user_id == current_user.id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter((Endpoint.name.ilike(search_pattern)) | (Endpoint.url.ilike(search_pattern)))

    if environment:
        query = query.filter(Endpoint.environment == environment)

    if status_filter:
        query = query.filter(Endpoint.status == status_filter)

    if tag:
        query = query.filter(Endpoint.tags.ilike(f"%{tag.strip()}%"))

    return query.order_by(Endpoint.created_at.desc()).all()


@router.post("", response_model=EndpointResponse, status_code=status.HTTP_201_CREATED)
def create_endpoint(
    endpoint_in: EndpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Register a new monitored endpoint after passing SSRF safety verification."""
    is_safe, reason, _ = validate_url_safety(endpoint_in.url)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"URL rejected by SSRF protection policy: {reason}"
        )

    endpoint = Endpoint(
        user_id=current_user.id,
        name=endpoint_in.name,
        url=endpoint_in.url,
        method=endpoint_in.method,
        headers_json=endpoint_in.headers_json,
        body_payload=endpoint_in.body_payload,
        expected_status_codes=endpoint_in.expected_status_codes,
        check_interval_seconds=endpoint_in.check_interval_seconds,
        timeout_seconds=endpoint_in.timeout_seconds,
        environment=endpoint_in.environment,
        tags=endpoint_in.tags,
        latency_threshold_ms=endpoint_in.latency_threshold_ms,
        json_body_assertion=endpoint_in.json_body_assertion,
        is_active=True,
        status="unknown"
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.get("/{endpoint_id}", response_model=EndpointResponse)
def get_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve details of a single monitored endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    if current_user.role != "admin" and endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this endpoint")
    return endpoint


@router.patch("/{endpoint_id}", response_model=EndpointResponse)
def update_endpoint(
    endpoint_id: int,
    endpoint_in: EndpointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update monitored endpoint configuration."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    if current_user.role != "admin" and endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this endpoint")

    if endpoint_in.url and endpoint_in.url != endpoint.url:
        is_safe, reason, _ = validate_url_safety(endpoint_in.url)
        if not is_safe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"URL rejected by SSRF protection policy: {reason}"
            )

    update_data = endpoint_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(endpoint, field, value)

    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Delete an endpoint and all related monitoring history."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    if current_user.role != "admin" and endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this endpoint")

    db.delete(endpoint)
    db.commit()


@router.post("/{endpoint_id}/check", response_model=CheckResultResponse)
async def check_endpoint_now(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Trigger an immediate real-time manual check for an endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    if current_user.role != "admin" and endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to monitor this endpoint")

    check_data = await execute_http_check(endpoint, source="manual")
    result = evaluate_and_record_check(db, endpoint, check_data)
    return result


@router.post("/{endpoint_id}/pause", response_model=EndpointResponse)
def pause_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Pause automatic health checks for an endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    if current_user.role != "admin" and endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this endpoint")

    endpoint.is_active = False
    endpoint.status = "paused"
    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.post("/{endpoint_id}/resume", response_model=EndpointResponse)
def resume_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Resume automatic health checks for an endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    if current_user.role != "admin" and endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this endpoint")

    endpoint.is_active = True
    endpoint.status = "unknown"
    db.commit()
    db.refresh(endpoint)
    return endpoint
