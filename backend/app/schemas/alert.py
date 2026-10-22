from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    endpoint_id: Optional[int] = None  # None indicates applies to all user's endpoints
    condition_type: str = Field(..., pattern="^(consecutive_failures|latency_threshold|status_code_mismatch|downtime)$")
    threshold_value: float = Field(..., gt=0)
    severity: str = Field("high", pattern="^(critical|high|medium|low)$")
    cooldown_minutes: int = Field(15, ge=1, le=1440)
    is_enabled: bool = True


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    condition_type: Optional[str] = Field(None, pattern="^(consecutive_failures|latency_threshold|status_code_mismatch|downtime)$")
    threshold_value: Optional[float] = Field(None, gt=0)
    severity: Optional[str] = Field(None, pattern="^(critical|high|medium|low)$")
    cooldown_minutes: Optional[int] = Field(None, ge=1, le=1440)
    is_enabled: Optional[bool] = None


class AlertRuleResponse(BaseModel):
    id: int
    user_id: int
    endpoint_id: Optional[int] = None
    name: str
    condition_type: str
    threshold_value: float
    severity: str
    is_enabled: bool
    cooldown_minutes: int
    last_triggered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertEventResponse(BaseModel):
    id: int
    alert_rule_id: Optional[int] = None
    endpoint_id: int
    title: str
    message: str
    severity: str
    status: str
    is_read: bool
    triggered_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
