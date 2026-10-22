from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.db.session import Base


class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    duration_ms = Column(Float, nullable=False)
    status_code = Column(Integer, nullable=True)
    is_success = Column(Boolean, nullable=False, index=True)
    outcome = Column(String(50), nullable=False, index=True)  # success, degraded, failure, timeout, connection_error, ssrf_blocked
    error_category = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    response_size_bytes = Column(Integer, default=0, nullable=False)
    resolved_ip = Column(String(100), nullable=True)
    source = Column(String(50), default="scheduled", nullable=False)  # scheduled, manual

    endpoint = relationship("Endpoint", back_populates="checks")

    __table_args__ = (
        Index("ix_endpoint_timestamp", "endpoint_id", "timestamp"),
        Index("ix_endpoint_outcome", "endpoint_id", "outcome"),
    )
