from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class IncidentTimelineResponse(BaseModel):
    id: int
    incident_id: int
    timestamp: datetime
    event_type: str
    message: str
    author: str

    class Config:
        from_attributes = True


class IncidentResponse(BaseModel):
    id: int
    endpoint_id: int
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    started_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None
    affected_checks_count: int
    timeline_events: Optional[List[IncidentTimelineResponse]] = []

    class Config:
        from_attributes = True


class IncidentAcknowledge(BaseModel):
    acknowledged_by: Optional[str] = "Admin"
    note: Optional[str] = "Incident acknowledged and under active investigation."


class IncidentResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=3)
    root_cause: Optional[str] = "Transient network failure / recovered"


class IncidentNoteCreate(BaseModel):
    message: str = Field(..., min_length=2)
    author: Optional[str] = "User"
