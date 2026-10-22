import pytest
import httpx
from app.main import app
from app.models.endpoint import Endpoint
from app.services.monitoring import execute_http_check
from app.services.evaluator import evaluate_and_record_check


@pytest.mark.asyncio
async def test_execute_http_check_healthy(db_session, test_user, monkeypatch):
    # Mock httpx.AsyncClient inside execute_http_check to route to FastAPI in-process app
    transport = httpx.ASGITransport(app=app)
    original_async_client = httpx.AsyncClient

    def mocked_client(*args, **kwargs):
        kwargs["transport"] = transport
        kwargs["base_url"] = "http://testserver"
        return original_async_client(*args, **kwargs)

    monkeypatch.setattr("app.services.monitoring.httpx.AsyncClient", mocked_client)

    ep = Endpoint(
        user_id=test_user.id,
        name="Healthy Test Target",
        url="http://testserver/api/v1/mock-targets/healthy",
        method="GET",
        expected_status_codes="200",
        timeout_seconds=5.0,
        latency_threshold_ms=500.0,
        is_active=True
    )
    db_session.add(ep)
    db_session.commit()
    db_session.refresh(ep)

    result_data = await execute_http_check(ep, source="test")
    assert result_data["is_success"] is True
    assert result_data["status_code"] == 200
    assert result_data["outcome"] in ("success", "degraded")
    assert result_data["duration_ms"] >= 0.0

    check_rec = evaluate_and_record_check(db_session, ep, result_data)
    assert check_rec.is_success is True
    assert ep.status == "healthy"
    assert ep.consecutive_failures == 0


@pytest.mark.asyncio
async def test_execute_http_check_error_and_consecutive_down(db_session, test_user, monkeypatch):
    transport = httpx.ASGITransport(app=app)
    original_async_client = httpx.AsyncClient

    def mocked_client(*args, **kwargs):
        kwargs["transport"] = transport
        kwargs["base_url"] = "http://testserver"
        return original_async_client(*args, **kwargs)

    monkeypatch.setattr("app.services.monitoring.httpx.AsyncClient", mocked_client)

    ep = Endpoint(
        user_id=test_user.id,
        name="Failing Test Target",
        url="http://testserver/api/v1/mock-targets/error",
        method="GET",
        expected_status_codes="200",
        timeout_seconds=5.0,
        latency_threshold_ms=500.0,
        is_active=True
    )
    db_session.add(ep)
    db_session.commit()
    db_session.refresh(ep)

    # First failure (HTTP 500)
    check1 = await execute_http_check(ep, source="test")
    assert check1["is_success"] is False
    assert check1["status_code"] == 500
    evaluate_and_record_check(db_session, ep, check1)
    assert ep.consecutive_failures == 1

    # Second failure -> should trigger DOWN state
    check2 = await execute_http_check(ep, source="test")
    evaluate_and_record_check(db_session, ep, check2)
    assert ep.consecutive_failures == 2
    assert ep.status == "down"
