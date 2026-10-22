from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.endpoint import Endpoint
from app.models.check import CheckResult
from app.models.incident import Incident, IncidentTimeline
from app.models.alert import AlertRule, AlertEvent


def evaluate_and_record_check(
    db: Session,
    endpoint: Endpoint,
    check_data: Dict[str, Any]
) -> CheckResult:
    """
    Persists check result, updates endpoint status using consecutive failure policy,
    evaluates incidents (creation, recovery, deduplication), and triggers alerts with cooldown.
    """
    now = check_data["timestamp"]

    # 1. Create and save CheckResult
    check_result = CheckResult(
        endpoint_id=endpoint.id,
        timestamp=now,
        duration_ms=check_data["duration_ms"],
        status_code=check_data.get("status_code"),
        is_success=check_data["is_success"],
        outcome=check_data["outcome"],
        error_category=check_data.get("error_category"),
        error_message=check_data.get("error_message"),
        response_size_bytes=check_data.get("response_size_bytes", 0),
        resolved_ip=check_data.get("resolved_ip"),
        source=check_data.get("source", "scheduled")
    )
    db.add(check_result)

    # 2. Update Endpoint Telemetry
    endpoint.last_checked_at = now
    endpoint.last_response_time_ms = check_data["duration_ms"]
    endpoint.last_status_code = check_data.get("status_code")

    if not endpoint.is_active:
        endpoint.status = "paused"
        db.commit()
        db.refresh(check_result)
        return check_result

    outcome = check_data["outcome"]

    # 3. Health State Classification & Incident Evaluation
    if outcome == "success":
        endpoint.consecutive_successes += 1
        endpoint.consecutive_failures = 0
        endpoint.last_success_at = now
        endpoint.status = "healthy"

        # Check for open incidents to auto-resolve on recovery
        open_incident = db.query(Incident).filter(
            Incident.endpoint_id == endpoint.id,
            Incident.status.in_(["open", "acknowledged", "investigating"])
        ).first()

        if open_incident:
            open_incident.status = "resolved"
            open_incident.resolved_at = now
            open_incident.resolution_notes = (
                f"Automatic recovery detected: Endpoint returned expected status "
                f"{check_data.get('status_code')} with response time {check_data['duration_ms']}ms."
            )
            timeline = IncidentTimeline(
                incident_id=open_incident.id,
                timestamp=now,
                event_type="resolved",
                message=f"Endpoint recovered successfully. Latency: {check_data['duration_ms']}ms.",
                author="PulseCloud Auto-Recovery Engine"
            )
            db.add(timeline)

    elif outcome == "degraded":
        # Keep failure count unchanged or reset depending on preference; reachable but slow
        endpoint.consecutive_successes = 0
        if endpoint.status != "down":
            endpoint.status = "degraded"

    else:  # failure, timeout, connection_error, ssrf_blocked
        endpoint.consecutive_failures += 1
        endpoint.consecutive_successes = 0
        endpoint.last_failure_at = now

        # Only transition to DOWN if consecutive failures exceed threshold
        if endpoint.consecutive_failures >= settings.CONSECUTIVE_FAILURES_FOR_DOWN:
            endpoint.status = "down"

            # Check if active incident already exists (Duplicate Incident Prevention)
            existing_incident = db.query(Incident).filter(
                Incident.endpoint_id == endpoint.id,
                Incident.status.in_(["open", "acknowledged", "investigating"])
            ).first()

            if not existing_incident:
                # Create new Incident
                severity = "critical" if outcome in ("timeout", "connection_error") else "high"
                title = f"{endpoint.name} is DOWN ({outcome.replace('_', ' ').title()})"
                description = (
                    f"Endpoint has failed {endpoint.consecutive_failures} consecutive checks. "
                    f"Last error: {check_data.get('error_message') or outcome}."
                )
                incident = Incident(
                    endpoint_id=endpoint.id,
                    title=title,
                    description=description,
                    severity=severity,
                    status="open",
                    started_at=now,
                    root_cause=check_data.get("error_category", outcome.upper()),
                    affected_checks_count=endpoint.consecutive_failures
                )
                db.add(incident)
                db.flush()  # assign id

                timeline = IncidentTimeline(
                    incident_id=incident.id,
                    timestamp=now,
                    event_type="created",
                    message=f"Incident opened automatically: {description}",
                    author="PulseCloud Monitoring Engine"
                )
                db.add(timeline)
            else:
                existing_incident.affected_checks_count += 1

    # 4. Evaluate Alert Rules & Enforce Cooldown
    evaluate_alerts_for_endpoint(db, endpoint, check_data, now)

    db.commit()
    db.refresh(check_result)
    return check_result


def evaluate_alerts_for_endpoint(
    db: Session,
    endpoint: Endpoint,
    check_data: Dict[str, Any],
    now: datetime
) -> None:
    """
    Evaluates enabled alert rules for an endpoint, respecting per-rule cooldown intervals.
    """
    # Find matching rules: endpoint-specific or global (endpoint_id is None)
    rules = db.query(AlertRule).filter(
        AlertRule.is_enabled == True,
        (AlertRule.endpoint_id == endpoint.id) | (AlertRule.endpoint_id == None),
        AlertRule.user_id == endpoint.user_id
    ).all()

    for rule in rules:
        # Check cooldown
        if rule.last_triggered_at:
            cooldown_delta = timedelta(minutes=rule.cooldown_minutes)
            # Ensure timezone compatibility
            last_trig = rule.last_triggered_at
            if last_trig.tzinfo is None:
                last_trig = last_trig.replace(tzinfo=timezone.utc)
            if now < (last_trig + cooldown_delta):
                continue  # Within cooldown period; prevent alert storm

        should_trigger = False
        alert_title = ""
        alert_message = ""

        if rule.condition_type == "consecutive_failures":
            if endpoint.consecutive_failures >= rule.threshold_value:
                should_trigger = True
                alert_title = f"Alert: {endpoint.name} consecutive failure threshold met"
                alert_message = f"Endpoint has reached {endpoint.consecutive_failures} consecutive failures."
        elif rule.condition_type == "latency_threshold":
            if check_data["duration_ms"] >= rule.threshold_value and check_data.get("outcome") != "ssrf_blocked":
                should_trigger = True
                alert_title = f"Alert: {endpoint.name} excessive latency"
                alert_message = f"Measured response time of {check_data['duration_ms']}ms exceeded threshold of {rule.threshold_value}ms."
        elif rule.condition_type == "status_code_mismatch":
            if check_data.get("status_code") and not check_data["is_success"]:
                should_trigger = True
                alert_title = f"Alert: {endpoint.name} HTTP status mismatch"
                alert_message = f"Received unexpected status code {check_data.get('status_code')}."
        elif rule.condition_type == "downtime":
            if endpoint.status == "down":
                should_trigger = True
                alert_title = f"Alert: {endpoint.name} is currently DOWN"
                alert_message = f"Downtime detected for endpoint '{endpoint.name}'. Last check outcome: {check_data['outcome']}."

        if should_trigger:
            alert_event = AlertEvent(
                alert_rule_id=rule.id,
                endpoint_id=endpoint.id,
                title=alert_title,
                message=alert_message,
                severity=rule.severity,
                status="active",
                is_read=False,
                triggered_at=now
            )
            db.add(alert_event)
            rule.last_triggered_at = now
