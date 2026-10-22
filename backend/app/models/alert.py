from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    condition_type = Column(String(50), nullable=False)  # consecutive_failures, latency_threshold, status_code_mismatch, downtime
    threshold_value = Column(Float, nullable=False)  # e.g., 2 failures, 800 ms latency
    severity = Column(String(50), default="high", nullable=False)  # critical, high, medium, low
    is_enabled = Column(Boolean, default=True, nullable=False)
    cooldown_minutes = Column(Integer, default=15, nullable=False)
    last_triggered_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="alert_rules")
    endpoint = relationship("Endpoint", back_populates="alert_rules")
    events = relationship("AlertEvent", back_populates="rule", cascade="all, delete-orphan")


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, index=True)
    alert_rule_id = Column(Integer, ForeignKey("alert_rules.id", ondelete="SET NULL"), nullable=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default="high", nullable=False)  # critical, high, medium, low
    status = Column(String(50), default="active", nullable=False, index=True)  # active, acknowledged, resolved
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    triggered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)

    rule = relationship("AlertRule", back_populates="events")
    endpoint = relationship("Endpoint")
