from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.endpoint import Endpoint
from app.models.alert import AlertRule, AlertEvent
from app.schemas.alert import (
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleResponse,
    AlertEventResponse
)

router = APIRouter()


@router.get("", response_model=List[AlertEventResponse])
def get_alert_events(
    endpoint_id: Optional[int] = None,
    is_read: Optional[bool] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve in-app alert notifications for current user."""
    query = db.query(AlertEvent).join(Endpoint, AlertEvent.endpoint_id == Endpoint.id)

    if current_user.role != "admin":
        query = query.filter(Endpoint.user_id == current_user.id)

    if endpoint_id:
        query = query.filter(AlertEvent.endpoint_id == endpoint_id)

    if is_read is not None:
        query = query.filter(AlertEvent.is_read == is_read)

    if status_filter:
        query = query.filter(AlertEvent.status == status_filter)

    return query.order_by(AlertEvent.triggered_at.desc()).limit(100).all()


@router.patch("/events/{event_id}/read", response_model=AlertEventResponse)
def mark_alert_read(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Mark an alert notification as read."""
    event = db.query(AlertEvent).join(Endpoint, AlertEvent.endpoint_id == Endpoint.id).filter(AlertEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Alert event not found")
    if current_user.role != "admin" and event.endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    event.is_read = True
    db.commit()
    db.refresh(event)
    return event


@router.post("/events/read-all")
def mark_all_alerts_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Mark all active notifications for the current user as read."""
    events = db.query(AlertEvent).join(Endpoint, AlertEvent.endpoint_id == Endpoint.id).filter(
        Endpoint.user_id == current_user.id,
        AlertEvent.is_read == False
    ).all()
    for ev in events:
        ev.is_read = True
    db.commit()
    return {"marked_read_count": len(events)}


@router.get("/rules", response_model=List[AlertRuleResponse])
def get_alert_rules(
    endpoint_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve configured alert rules."""
    query = db.query(AlertRule)
    if current_user.role != "admin":
        query = query.filter(AlertRule.user_id == current_user.id)

    if endpoint_id:
        query = query.filter(AlertRule.endpoint_id == endpoint_id)

    return query.order_by(AlertRule.created_at.desc()).all()


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
def create_alert_rule(
    rule_in: AlertRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new alert trigger rule."""
    if rule_in.endpoint_id:
        endpoint = db.query(Endpoint).filter(Endpoint.id == rule_in.endpoint_id).first()
        if not endpoint:
            raise HTTPException(status_code=404, detail="Specified endpoint not found")
        if current_user.role != "admin" and endpoint.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to configure alerts for this endpoint")

    rule = AlertRule(
        user_id=current_user.id,
        endpoint_id=rule_in.endpoint_id,
        name=rule_in.name,
        condition_type=rule_in.condition_type,
        threshold_value=rule_in.threshold_value,
        severity=rule_in.severity,
        cooldown_minutes=rule_in.cooldown_minutes,
        is_enabled=rule_in.is_enabled
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
def update_alert_rule(
    rule_id: int,
    rule_in: AlertRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update an existing alert rule."""
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    if current_user.role != "admin" and rule.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this rule")

    update_data = rule_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(rule, field, val)

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Delete an alert rule."""
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    if current_user.role != "admin" and rule.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this rule")

    db.delete(rule)
    db.commit()
