from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel


class OverviewSummaryResponse(BaseModel):
    total_endpoints: int
    healthy_endpoints: int
    degraded_endpoints: int
    down_endpoints: int
    paused_endpoints: int
    unknown_endpoints: int
    average_response_time_ms: float
    overall_uptime_percentage: float
    active_incidents_count: int
    checks_executed_today: int
    period_hours: int
    sample_checks_count: int


class LatencyPercentilesResponse(BaseModel):
    sample_count: int
    min_ms: float
    max_ms: float
    avg_ms: float
    median_ms: float
    p95_ms: float
    p99_ms: float
    is_statistically_reliable: bool


class UptimePeriodMetrics(BaseModel):
    period_label: str
    uptime_percentage: float
    total_checks: int
    successful_checks: int
    failed_checks: int
    outage_duration_minutes: float


class StatusCodeDistributionItem(BaseModel):
    status_code: str
    count: int
    percentage: float


class LatencyTimeSeriesPoint(BaseModel):
    timestamp: datetime
    avg_latency_ms: float
    p95_latency_ms: float
    error_count: int


class EndpointAnalyticsResponse(BaseModel):
    endpoint_id: int
    endpoint_name: str
    uptime_24h: float
    uptime_7d: float
    uptime_30d: float
    latency: LatencyPercentilesResponse
    status_codes: List[StatusCodeDistributionItem]
    time_series: List[LatencyTimeSeriesPoint]


class ReportJobCreate(BaseModel):
    title: str
    report_type: str = "health"  # health, uptime, latency, incidents, environment_comparison
    format: str = "csv"  # csv, json
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    endpoint_id: Optional[int] = None
    environment: Optional[str] = None


class ReportJobResponse(BaseModel):
    id: int
    user_id: int
    title: str
    report_type: str
    status: str
    format: str
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    row_count: int
    file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
