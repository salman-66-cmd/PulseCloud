from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.endpoint import Endpoint
from app.models.incident import Incident, IncidentTimeline
from app.schemas.incident import (
    IncidentResponse,
    IncidentAcknowledge,
    IncidentResolve,
    IncidentNoteCreate,
    IncidentTimelineResponse
)

router = APIRouter()


@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    endpoint_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List incidents with filtering."""
    query = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id)

    if current_user.role != "admin":
        query = query.filter(Endpoint.user_id == current_user.id)

    if endpoint_id:
        query = query.filter(Incident.endpoint_id == endpoint_id)

    if status_filter:
        query = query.filter(Incident.status == status_filter)

    if severity:
        query = query.filter(Incident.severity == severity)

    return query.order_by(Incident.started_at.desc()).all()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve detailed incident record with full audit timeline."""
    incident = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role != "admin" and incident.endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this incident")
    return incident


@router.post("/{incident_id}/acknowledge", response_model=IncidentResponse)
def acknowledge_incident(
    incident_id: int,
    ack_data: IncidentAcknowledge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Acknowledge an active incident and append audit event."""
    incident = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role != "admin" and incident.endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this incident")

    now = datetime.now(timezone.utc)
    incident.status = "acknowledged"
    incident.acknowledged_at = now
    incident.acknowledged_by = ack_data.acknowledged_by or current_user.full_name or current_user.email

    timeline = IncidentTimeline(
        incident_id=incident.id,
        timestamp=now,
        event_type="acknowledged",
        message=ack_data.note or "Incident acknowledged.",
        author=incident.acknowledged_by
    )
    db.add(timeline)
    db.commit()
    db.refresh(incident)
    return incident


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(
    incident_id: int,
    resolve_data: IncidentResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Resolve an incident and record root cause analysis and resolution notes."""
    incident = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role != "admin" and incident.endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this incident")

    now = datetime.now(timezone.utc)
    incident.status = "resolved"
    incident.resolved_at = now
    incident.root_cause = resolve_data.root_cause
    incident.resolution_notes = resolve_data.resolution_notes

    timeline = IncidentTimeline(
        incident_id=incident.id,
        timestamp=now,
        event_type="resolved",
        message=f"Incident resolved: {resolve_data.resolution_notes}",
        author=current_user.full_name or current_user.email
    )
    db.add(timeline)
    db.commit()
    db.refresh(incident)
    return incident


@router.post("/{incident_id}/notes", response_model=IncidentTimelineResponse, status_code=status.HTTP_201_CREATED)
def add_incident_note(
    incident_id: int,
    note_in: IncidentNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Add an investigation note to the incident timeline."""
    incident = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role != "admin" and incident.endpoint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this incident")

    now = datetime.now(timezone.utc)
    # Automatically promote to investigating if currently open
    if incident.status == "open":
        incident.status = "investigating"

    timeline = IncidentTimeline(
        incident_id=incident.id,
        timestamp=now,
        event_type="note_added",
        message=note_in.message,
        author=current_user.full_name or current_user.email
    )
    db.add(timeline)
    db.commit()
    db.refresh(timeline)
    return timeline
