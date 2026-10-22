import random
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.endpoint import Endpoint
from app.models.check import CheckResult
from app.models.incident import Incident, IncidentTimeline
from app.models.alert import AlertRule, AlertEvent

router = APIRouter()


@router.get("/health")
def health_check():
    """Liveness probe: verifies API application is running."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "PulseCloud Monitor API"
    }


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe: validates database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unready",
            "database": f"error: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.post("/seed-demo")
def seed_demo_data(db: Session = Depends(get_db)) -> Any:
    """Populates realistic demo users, endpoints, history, and incidents."""
    # Check or create demo user
    admin_user = db.query(User).filter(User.email == "admin@pulsecloud.io").first()
    if not admin_user:
        admin_user = User(
            email="admin@pulsecloud.io",
            full_name="Cloud Admin",
            hashed_password=get_password_hash("Admin123!"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    dev_user = db.query(User).filter(User.email == "engineer@pulsecloud.io").first()
    if not dev_user:
        dev_user = User(
            email="engineer@pulsecloud.io",
            full_name="DevOps Engineer",
            hashed_password=get_password_hash("DevOps123!"),
            role="user",
            is_active=True
        )
        db.add(dev_user)
        db.commit()
        db.refresh(dev_user)

    # Check if endpoints already exist
    existing_count = db.query(Endpoint).filter(Endpoint.user_id == admin_user.id).count()
    if existing_count > 0:
        return {"message": "Demo data already initialized", "endpoint_count": existing_count}

    now = datetime.now(timezone.utc)

    # Monitored Endpoints setup
    demo_endpoints = [
        {
            "name": "Auth & SSO Service",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
            "method": "GET",
            "environment": "Production",
            "status": "healthy",
            "check_interval_seconds": 30,
            "latency_threshold_ms": 300.0,
            "tags": "core,auth,security"
        },
        {
            "name": "Payment Gateway API",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
            "method": "GET",
            "environment": "Production",
            "status": "healthy",
            "check_interval_seconds": 15,
            "latency_threshold_ms": 500.0,
            "tags": "finance,stripe,critical"
        },
        {
            "name": "Analytics Ingestion Pipeline",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/slow",
            "method": "GET",
            "environment": "Staging",
            "status": "degraded",
            "check_interval_seconds": 60,
            "latency_threshold_ms": 400.0,
            "tags": "data,analytics,pipeline"
        },
        {
            "name": "Third-Party SMS Gateway",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/error",
            "method": "GET",
            "environment": "Production",
            "status": "down",
            "check_interval_seconds": 30,
            "latency_threshold_ms": 600.0,
            "tags": "notifications,sms,external"
        },
        {
            "name": "User Profile Microservice",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
            "method": "GET",
            "environment": "Development",
            "status": "healthy",
            "check_interval_seconds": 120,
            "latency_threshold_ms": 500.0,
            "tags": "users,profile,api"
        },
        {
            "name": "Legacy Billing Sync",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
            "method": "GET",
            "environment": "Internal",
            "status": "paused",
            "check_interval_seconds": 300,
            "latency_threshold_ms": 1000.0,
            "tags": "legacy,batch,billing"
        }
    ]

    created_eps = []
    for ep_dict in demo_endpoints:
        ep = Endpoint(
            user_id=admin_user.id,
            name=ep_dict["name"],
            url=ep_dict["url"],
            method=ep_dict["method"],
            environment=ep_dict["environment"],
            status=ep_dict["status"],
            check_interval_seconds=ep_dict["check_interval_seconds"],
            latency_threshold_ms=ep_dict["latency_threshold_ms"],
            tags=ep_dict["tags"],
            expected_status_codes="200",
            timeout_seconds=10.0,
            is_active=(ep_dict["status"] != "paused"),
            last_checked_at=now - timedelta(seconds=12),
            last_response_time_ms=18.5 if ep_dict["status"] == "healthy" else (1250.0 if ep_dict["status"] == "degraded" else 0.0),
            last_status_code=200 if ep_dict["status"] in ("healthy", "degraded") else 500
        )
        db.add(ep)
        db.flush()
        created_eps.append(ep)

        # Generate 40 historical check records over the last 24 hours for realistic charts
        for i in range(40):
            check_time = now - timedelta(minutes=(40 - i) * 36)
            if ep.status == "healthy":
                dur = round(random.uniform(15.0, 75.0), 1)
                is_succ = True
                outc = "success"
                sc = 200
                err_cat = None
                err_msg = None
            elif ep.status == "degraded":
                dur = round(random.uniform(850.0, 1400.0), 1)
                is_succ = True
                outc = "degraded"
                sc = 200
                err_cat = "LATENCY_DEGRADED"
                err_msg = f"Latency {dur}ms exceeded threshold"
            elif ep.status == "down":
                dur = round(random.uniform(20.0, 150.0), 1)
                is_succ = False
                outc = "failure"
                sc = 500
                err_cat = "HTTP_SERVER_ERROR"
                err_msg = "Simulated database connection failure (500 Internal Server Error)"
            else:
                dur = round(random.uniform(20.0, 60.0), 1)
                is_succ = True
                outc = "success"
                sc = 200
                err_cat = None
                err_msg = None

            check_rec = CheckResult(
                endpoint_id=ep.id,
                timestamp=check_time,
                duration_ms=dur,
                status_code=sc,
                is_success=is_succ,
                outcome=outc,
                error_category=err_cat,
                error_message=err_msg,
                response_size_bytes=random.randint(120, 1400),
                resolved_ip="127.0.0.1",
                source="scheduled"
            )
            db.add(check_rec)

    # Add active incident for the "Down" endpoint
    down_ep = [e for e in created_eps if e.status == "down"][0]
    down_ep.consecutive_failures = 4
    inc = Incident(
        endpoint_id=down_ep.id,
        title=f"{down_ep.name} Outage (HTTP 500)",
        description="Endpoint is returning HTTP 500 Internal Server Error repeatedly.",
        severity="critical",
        status="open",
        started_at=now - timedelta(hours=2, minutes=14),
        root_cause="HTTP_SERVER_ERROR",
        affected_checks_count=4
    )
    db.add(inc)
    db.flush()

    inc_tl = IncidentTimeline(
        incident_id=inc.id,
        timestamp=now - timedelta(hours=2, minutes=14),
        event_type="created",
        message="Incident triggered automatically after 2 consecutive failed health checks.",
        author="PulseCloud Incident Engine"
    )
    db.add(inc_tl)

    # Add alert rule and alert event
    rule1 = AlertRule(
        user_id=admin_user.id,
        endpoint_id=down_ep.id,
        name="Critical SMS Gateway Outage Alert",
        condition_type="consecutive_failures",
        threshold_value=2.0,
        severity="critical",
        cooldown_minutes=15,
        is_enabled=True,
        last_triggered_at=now - timedelta(hours=2, minutes=14)
    )
    db.add(rule1)
    db.flush()

    alert_ev = AlertEvent(
        alert_rule_id=rule1.id,
        endpoint_id=down_ep.id,
        title="Downtime: Third-Party SMS Gateway is Down",
        message="Endpoint reached 4 consecutive check failures. Server returned 500.",
        severity="critical",
        status="active",
        is_read=False,
        triggered_at=now - timedelta(hours=2, minutes=14)
    )
    db.add(alert_ev)

    db.commit()
    return {"message": "Demo data successfully seeded", "endpoint_count": len(created_eps)}
