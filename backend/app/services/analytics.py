import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.endpoint import Endpoint
from app.models.check import CheckResult
from app.models.incident import Incident


def calculate_percentiles(durations: List[float]) -> Dict[str, Any]:
    """
    Calculates min, max, avg, median (p50), p95, p99 percentiles from a list of latencies.
    Includes statistical reliability flag (minimum 20 samples recommended for p95/p99).
    """
    count = len(durations)
    if count == 0:
        return {
            "sample_count": 0,
            "min_ms": 0.0,
            "max_ms": 0.0,
            "avg_ms": 0.0,
            "median_ms": 0.0,
            "p95_ms": 0.0,
            "p99_ms": 0.0,
            "is_statistically_reliable": False
        }

    sorted_d = sorted(durations)
    avg_val = round(sum(sorted_d) / count, 2)
    min_val = round(sorted_d[0], 2)
    max_val = round(sorted_d[-1], 2)

    def get_percentile(data: List[float], p: float) -> float:
        if not data:
            return 0.0
        k = (len(data) - 1) * p
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return data[int(k)]
        d0 = data[int(f)] * (c - k)
        d1 = data[int(c)] * (k - f)
        return round(d0 + d1, 2)

    median_val = get_percentile(sorted_d, 0.50)
    p95_val = get_percentile(sorted_d, 0.95)
    p99_val = get_percentile(sorted_d, 0.99)

    return {
        "sample_count": count,
        "min_ms": min_val,
        "max_ms": max_val,
        "avg_ms": avg_val,
        "median_ms": median_val,
        "p95_ms": p95_val,
        "p99_ms": p99_val,
        "is_statistically_reliable": count >= 20
    }


def get_uptime_metrics(db: Session, endpoint_id: Optional[int] = None, user_id: Optional[int] = None, hours: int = 24) -> Dict[str, Any]:
    """
    Calculates observed uptime percentage over a specified window (hours).
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.timestamp >= since)

    if endpoint_id:
        query = query.filter(CheckResult.endpoint_id == endpoint_id)
    elif user_id:
        query = query.filter(Endpoint.user_id == user_id)

    total_checks = query.count()
    if total_checks == 0:
        return {
            "period_label": f"Last {hours} Hours",
            "uptime_percentage": 100.0,
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "outage_duration_minutes": 0.0
        }

    successful_checks = query.filter(CheckResult.is_success == True).count()
    failed_checks = total_checks - successful_checks
    uptime_pct = round((successful_checks / total_checks) * 100.0, 2)

    # Estimate outage duration based on incident records in this period
    incident_query = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(Incident.started_at >= since)
    if endpoint_id:
        incident_query = incident_query.filter(Incident.endpoint_id == endpoint_id)
    elif user_id:
        incident_query = incident_query.filter(Endpoint.user_id == user_id)

    outage_minutes = 0.0
    for inc in incident_query.all():
        end_time = inc.resolved_at or datetime.now(timezone.utc)
        start_time = max(inc.started_at, since)
        # Ensure tz-awareness
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        diff = (end_time - start_time).total_seconds() / 60.0
        if diff > 0:
            outage_minutes += diff

    return {
        "period_label": f"Last {hours} Hours",
        "uptime_percentage": uptime_pct,
        "total_checks": total_checks,
        "successful_checks": successful_checks,
        "failed_checks": failed_checks,
        "outage_duration_minutes": round(outage_minutes, 1)
    }


def get_status_code_distribution(db: Session, endpoint_id: Optional[int] = None, user_id: Optional[int] = None, hours: int = 24) -> List[Dict[str, Any]]:
    """
    Groups HTTP check results by status code category.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.timestamp >= since)

    if endpoint_id:
        query = query.filter(CheckResult.endpoint_id == endpoint_id)
    elif user_id:
        query = query.filter(Endpoint.user_id == user_id)

    all_checks = query.all()
    total = len(all_checks)
    if total == 0:
        return []

    buckets: Dict[str, int] = {}
    for c in all_checks:
        if c.outcome == "timeout":
            key = "Timeout"
        elif c.outcome in ("connection_error", "ssrf_blocked"):
            key = "Conn Error"
        elif c.status_code:
            key = f"{c.status_code}"
        else:
            key = "Failed"
        buckets[key] = buckets.get(key, 0) + 1

    return [
        {
            "status_code": k,
            "count": v,
            "percentage": round((v / total) * 100.0, 1)
        }
        for k, v in sorted(buckets.items(), key=lambda x: x[1], reverse=True)
    ]


def get_overview_summary(db: Session, user_id: Optional[int] = None, hours: int = 24) -> Dict[str, Any]:
    """
    Generates data-driven overview dashboard metrics.
    """
    ep_query = db.query(Endpoint)
    if user_id:
        ep_query = ep_query.filter(Endpoint.user_id == user_id)
    endpoints = ep_query.all()

    total_endpoints = len(endpoints)
    healthy_count = sum(1 for e in endpoints if e.status == "healthy")
    degraded_count = sum(1 for e in endpoints if e.status == "degraded")
    down_count = sum(1 for e in endpoints if e.status == "down")
    paused_count = sum(1 for e in endpoints if e.status == "paused")
    unknown_count = sum(1 for e in endpoints if e.status == "unknown")

    # Latencies & Uptime in the specified window
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    check_query = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.timestamp >= since)
    if user_id:
        check_query = check_query.filter(Endpoint.user_id == user_id)

    recent_checks = check_query.all()
    sample_count = len(recent_checks)
    if sample_count > 0:
        avg_response_time = round(sum(c.duration_ms for c in recent_checks) / sample_count, 1)
        successful_checks = sum(1 for c in recent_checks if c.is_success)
        overall_uptime = round((successful_checks / sample_count) * 100.0, 2)
    else:
        avg_response_time = 0.0
        overall_uptime = 100.0

    # Active incidents
    inc_query = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(
        Incident.status.in_(["open", "acknowledged", "investigating"])
    )
    if user_id:
        inc_query = inc_query.filter(Endpoint.user_id == user_id)
    active_incidents = inc_query.count()

    # Checks executed today (UTC midnight)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_query = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.timestamp >= today_start)
    if user_id:
        today_query = today_query.filter(Endpoint.user_id == user_id)
    checks_today = today_query.count()

    return {
        "total_endpoints": total_endpoints,
        "healthy_endpoints": healthy_count,
        "degraded_endpoints": degraded_count,
        "down_endpoints": down_count,
        "paused_endpoints": paused_count,
        "unknown_endpoints": unknown_count,
        "average_response_time_ms": avg_response_time,
        "overall_uptime_percentage": overall_uptime,
        "active_incidents_count": active_incidents,
        "checks_executed_today": checks_today,
        "period_hours": hours,
        "sample_checks_count": sample_count
    }


def get_latency_timeline(db: Session, endpoint_id: Optional[int] = None, user_id: Optional[int] = None, hours: int = 24) -> List[Dict[str, Any]]:
    """
    Aggregates checks into time buckets (e.g., hourly or 10-minute) for timeline visualization.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = db.query(CheckResult).join(Endpoint, CheckResult.endpoint_id == Endpoint.id).filter(CheckResult.timestamp >= since).order_by(CheckResult.timestamp.asc())

    if endpoint_id:
        query = query.filter(CheckResult.endpoint_id == endpoint_id)
    elif user_id:
        query = query.filter(Endpoint.user_id == user_id)

    checks = query.all()
    if not checks:
        return []

    # Bucket into max 24 intervals
    step_minutes = max(5, int((hours * 60) / 24))
    buckets: Dict[str, List[CheckResult]] = {}

    for c in checks:
        t = c.timestamp
        # Round down to nearest step_minutes
        minute_bucket = (t.minute // step_minutes) * step_minutes
        bucket_key = t.replace(minute=minute_bucket, second=0, microsecond=0).isoformat()
        if bucket_key not in buckets:
            buckets[bucket_key] = []
        buckets[bucket_key].append(c)

    result = []
    for b_key in sorted(buckets.keys()):
        b_checks = buckets[b_key]
        durations = [x.duration_ms for x in b_checks]
        error_count = sum(1 for x in b_checks if not x.is_success)
        pcts = calculate_percentiles(durations)
        result.append({
            "timestamp": b_key,
            "avg_latency_ms": pcts["avg_ms"],
            "p95_latency_ms": pcts["p95_ms"],
            "min_latency_ms": pcts["min_ms"],
            "max_latency_ms": pcts["max_ms"],
            "error_count": error_count,
            "check_count": len(b_checks)
        })

    return result
