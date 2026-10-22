import csv
import io
import json
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.endpoint import Endpoint
from app.models.check import CheckResult
from app.models.incident import Incident
from app.models.report import ReportJob
from app.services.analytics import get_uptime_metrics, calculate_percentiles


def generate_report(db: Session, report_job: ReportJob) -> ReportJob:
    """
    Processes a report job synchronously or asynchronously.
    Produces valid CSV or JSON output from real monitoring records.
    """
    user_id = report_job.user_id
    report_type = report_job.report_type
    format_type = (report_job.format or "csv").lower()

    endpoints = db.query(Endpoint).filter(Endpoint.user_id == user_id).all()
    rows = []

    if report_type == "health":
        headers = ["Endpoint ID", "Name", "URL", "Method", "Environment", "Status", "Last Checked", "Avg Response (ms)", "Consecutive Failures"]
        for ep in endpoints:
            rows.append({
                "Endpoint ID": ep.id,
                "Name": ep.name,
                "URL": ep.url,
                "Method": ep.method,
                "Environment": ep.environment,
                "Status": ep.status,
                "Last Checked": ep.last_checked_at.isoformat() if ep.last_checked_at else "Never",
                "Avg Response (ms)": ep.last_response_time_ms or 0.0,
                "Consecutive Failures": ep.consecutive_failures
            })

    elif report_type == "uptime":
        headers = ["Endpoint ID", "Name", "Environment", "24h Uptime (%)", "7d Uptime (%)", "30d Uptime (%)", "Total Checks (24h)", "Outage (mins)"]
        for ep in endpoints:
            u24 = get_uptime_metrics(db, endpoint_id=ep.id, hours=24)
            u7d = get_uptime_metrics(db, endpoint_id=ep.id, hours=168)
            u30d = get_uptime_metrics(db, endpoint_id=ep.id, hours=720)
            rows.append({
                "Endpoint ID": ep.id,
                "Name": ep.name,
                "Environment": ep.environment,
                "24h Uptime (%)": u24["uptime_percentage"],
                "7d Uptime (%)": u7d["uptime_percentage"],
                "30d Uptime (%)": u30d["uptime_percentage"],
                "Total Checks (24h)": u24["total_checks"],
                "Outage (mins)": u24["outage_duration_minutes"]
            })

    elif report_type == "latency":
        headers = ["Endpoint ID", "Name", "Environment", "Samples", "Min (ms)", "Max (ms)", "Avg (ms)", "Median (ms)", "P95 (ms)", "P99 (ms)", "Reliable"]
        for ep in endpoints:
            durations = [c.duration_ms for c in ep.checks[:100]]
            p = calculate_percentiles(durations)
            rows.append({
                "Endpoint ID": ep.id,
                "Name": ep.name,
                "Environment": ep.environment,
                "Samples": p["sample_count"],
                "Min (ms)": p["min_ms"],
                "Max (ms)": p["max_ms"],
                "Avg (ms)": p["avg_ms"],
                "Median (ms)": p["median_ms"],
                "P95 (ms)": p["p95_ms"],
                "P99 (ms)": p["p99_ms"],
                "Reliable": "Yes" if p["is_statistically_reliable"] else "No"
            })

    elif report_type == "incidents":
        headers = ["Incident ID", "Endpoint ID", "Title", "Severity", "Status", "Started At", "Resolved At", "Root Cause", "Acknowledged By"]
        incidents = db.query(Incident).join(Endpoint, Incident.endpoint_id == Endpoint.id).filter(Endpoint.user_id == user_id).all()
        for inc in incidents:
            rows.append({
                "Incident ID": inc.id,
                "Endpoint ID": inc.endpoint_id,
                "Title": inc.title,
                "Severity": inc.severity,
                "Status": inc.status,
                "Started At": inc.started_at.isoformat() if inc.started_at else "",
                "Resolved At": inc.resolved_at.isoformat() if inc.resolved_at else "Active",
                "Root Cause": inc.root_cause or "N/A",
                "Acknowledged By": inc.acknowledged_by or "Unacknowledged"
            })
    else:  # environment comparison
        headers = ["Environment", "Endpoint Count", "Healthy", "Degraded", "Down", "Paused"]
        envs = ["Production", "Staging", "Development", "Internal"]
        for env in envs:
            env_eps = [e for e in endpoints if e.environment == env]
            rows.append({
                "Environment": env,
                "Endpoint Count": len(env_eps),
                "Healthy": sum(1 for e in env_eps if e.status == "healthy"),
                "Degraded": sum(1 for e in env_eps if e.status == "degraded"),
                "Down": sum(1 for e in env_eps if e.status == "down"),
                "Paused": sum(1 for e in env_eps if e.status == "paused")
            })

    # Format the content
    if format_type == "json":
        content = json.dumps(rows, indent=2)
    else:
        # CSV
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        else:
            output.write("No records found for the selected criteria\n")
        content = output.getvalue()

    report_job.status = "completed"
    report_job.file_content = content
    report_job.row_count = len(rows)
    db.commit()
    db.refresh(report_job)
    return report_job
