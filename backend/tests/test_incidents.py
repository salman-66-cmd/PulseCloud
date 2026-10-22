import pytest
from app.models.endpoint import Endpoint
from app.models.incident import Incident
from app.services.evaluator import evaluate_and_record_check


def test_incident_auto_creation_and_recovery(db_session, test_user, client, user_auth_headers):
    # Create test endpoint
    ep = Endpoint(
        user_id=test_user.id,
        name="Billing API for Incident Test",
        url="http://127.0.0.1:8000/api/v1/mock-targets/error",
        method="GET",
        is_active=True
    )
    db_session.add(ep)
    db_session.commit()
    db_session.refresh(ep)

    # Simulate 2 consecutive failures
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    fail_data = {
        "timestamp": now,
        "duration_ms": 120.0,
        "status_code": 500,
        "is_success": False,
        "outcome": "failure",
        "error_category": "HTTP_SERVER_ERROR",
        "error_message": "500 Internal Server Error",
        "response_size_bytes": 50,
        "resolved_ip": "127.0.0.1",
        "source": "test"
    }

    evaluate_and_record_check(db_session, ep, fail_data)
    evaluate_and_record_check(db_session, ep, fail_data)

    assert ep.status == "down"

    # Check that an incident was automatically created
    incidents = db_session.query(Incident).filter(Incident.endpoint_id == ep.id).all()
    assert len(incidents) == 1
    inc = incidents[0]
    assert inc.status == "open"
    assert inc.severity in ("critical", "high")

    # Verify duplicate incident prevention: 3rd failure increments affected_checks_count instead of creating a 2nd incident
    evaluate_and_record_check(db_session, ep, fail_data)
    incidents_after = db_session.query(Incident).filter(Incident.endpoint_id == ep.id).all()
    assert len(incidents_after) == 1
    assert incidents_after[0].affected_checks_count >= 2

    # Acknowledge incident via API
    ack_res = client.post(
        f"/api/v1/incidents/{inc.id}/acknowledge",
        json={"acknowledged_by": "OnCall Engineer", "note": "Investigating database pool"},
        headers=user_auth_headers
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"

    # Add investigation note
    note_res = client.post(
        f"/api/v1/incidents/{inc.id}/notes",
        json={"message": "Restarted container service pod", "author": "DevOps"},
        headers=user_auth_headers
    )
    assert note_res.status_code == 201

    # Simulate recovery check -> Auto-resolves incident
    recover_data = {
        "timestamp": now,
        "duration_ms": 35.0,
        "status_code": 200,
        "is_success": True,
        "outcome": "success",
        "response_size_bytes": 100,
        "resolved_ip": "127.0.0.1",
        "source": "test"
    }
    evaluate_and_record_check(db_session, ep, recover_data)

    db_session.refresh(inc)
    assert inc.status == "resolved"
    assert "recovery" in inc.resolution_notes.lower()
