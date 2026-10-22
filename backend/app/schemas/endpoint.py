from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl, field_validator


class EndpointBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    url: str = Field(..., min_length=7, max_length=2048)
    method: str = Field("GET", pattern="^(GET|POST|HEAD|PUT|DELETE)$")
    headers_json: Optional[str] = None
    body_payload: Optional[str] = None
    expected_status_codes: str = Field("200", max_length=100)
    check_interval_seconds: int = Field(60, ge=10, le=3600)
    timeout_seconds: float = Field(10.0, ge=1.0, le=60.0)
    environment: str = Field("Production", pattern="^(Production|Staging|Development|Internal)$")
    tags: Optional[str] = None
    latency_threshold_ms: float = Field(800.0, ge=50.0, le=30000.0)
    json_body_assertion: Optional[str] = None

    @field_validator("url")
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class EndpointCreate(EndpointBase):
    pass


class EndpointUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    url: Optional[str] = Field(None, min_length=7, max_length=2048)
    method: Optional[str] = Field(None, pattern="^(GET|POST|HEAD|PUT|DELETE)$")
    headers_json: Optional[str] = None
    body_payload: Optional[str] = None
    expected_status_codes: Optional[str] = None
    check_interval_seconds: Optional[int] = Field(None, ge=10, le=3600)
    timeout_seconds: Optional[float] = Field(None, ge=1.0, le=60.0)
    environment: Optional[str] = Field(None, pattern="^(Production|Staging|Development|Internal)$")
    tags: Optional[str] = None
    is_active: Optional[bool] = None
    latency_threshold_ms: Optional[float] = Field(None, ge=50.0, le=30000.0)
    json_body_assertion: Optional[str] = None


class EndpointResponse(BaseModel):
    id: int
    user_id: int
    name: str
    url: str
    method: str
    headers_json: Optional[str] = None
    body_payload: Optional[str] = None
    expected_status_codes: str
    check_interval_seconds: int
    timeout_seconds: float
    environment: str
    tags: Optional[str] = None
    is_active: bool
    status: str
    consecutive_failures: int
    consecutive_successes: int
    latency_threshold_ms: float
    json_body_assertion: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    last_response_time_ms: Optional[float] = None
    last_status_code: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EndpointSummary(BaseModel):
    total: int
    healthy: int
    degraded: int
    down: int
    paused: int
    unknown: int
