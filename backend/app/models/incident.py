from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.db.session import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(50), default="high", nullable=False)  # critical, high, medium, low
    status = Column(String(50), default="open", nullable=False, index=True)  # open, acknowledged, investigating, resolved
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    root_cause = Column(String(255), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    affected_checks_count = Column(Integer, default=1, nullable=False)

    endpoint = relationship("Endpoint", back_populates="incidents")
    timeline_events = relationship("IncidentTimeline", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentTimeline.timestamp")

    __table_args__ = (
        Index("ix_endpoint_status", "endpoint_id", "status"),
    )


class IncidentTimeline(Base):
    __tablename__ = "incident_timeline"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    event_type = Column(String(50), nullable=False)  # created, acknowledged, investigating, note_added, resolved, reopened
    message = Column(Text, nullable=False)
    author = Column(String(255), default="System", nullable=False)

    incident = relationship("Incident", back_populates="timeline_events")
