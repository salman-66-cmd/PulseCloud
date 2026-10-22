from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Endpoint(Base):
    __tablename__ = "endpoints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    url = Column(String(2048), nullable=False)
    method = Column(String(10), default="GET", nullable=False)
    headers_json = Column(Text, nullable=True)
    body_payload = Column(Text, nullable=True)
    expected_status_codes = Column(String(100), default="200", nullable=False)  # Comma-separated: "200,201,204"
    check_interval_seconds = Column(Integer, default=60, nullable=False)  # Interval in seconds: 15, 30, 60, 300
    timeout_seconds = Column(Float, default=10.0, nullable=False)
    environment = Column(String(50), default="Production", nullable=False, index=True)  # Production, Staging, Development
    tags = Column(String(255), nullable=True)  # Comma-separated tags
    is_active = Column(Boolean, default=True, nullable=False)  # Paused or active
    
    # Current health state
    status = Column(String(50), default="unknown", nullable=False, index=True)  # healthy, degraded, down, unknown, paused
    consecutive_failures = Column(Integer, default=0, nullable=False)
    consecutive_successes = Column(Integer, default=0, nullable=False)
    latency_threshold_ms = Column(Float, default=800.0, nullable=False)
    json_body_assertion = Column(Text, nullable=True)  # Optional JSON path or key assertion

    # Telemetry snapshot
    last_checked_at = Column(DateTime, nullable=True)
    last_success_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    last_response_time_ms = Column(Float, nullable=True)
    last_status_code = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="endpoints")
    checks = relationship("CheckResult", back_populates="endpoint", cascade="all, delete-orphan", order_by="desc(CheckResult.timestamp)")
    incidents = relationship("Incident", back_populates="endpoint", cascade="all, delete-orphan", order_by="desc(Incident.started_at)")
    alert_rules = relationship("AlertRule", back_populates="endpoint", cascade="all, delete-orphan")
