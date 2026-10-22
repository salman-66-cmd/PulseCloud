def test_create_endpoint(client, user_auth_headers):
    payload = {
        "name": "Production Payment Gateway",
        "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
        "method": "GET",
        "environment": "Production",
        "expected_status_codes": "200,201",
        "check_interval_seconds": 30,
        "timeout_seconds": 5.0,
        "latency_threshold_ms": 400.0,
        "tags": "payments,core"
    }
    response = client.post("/api/v1/endpoints", json=payload, headers=user_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["status"] == "unknown"
    assert data["is_active"] is True
    assert "id" in data


def test_get_endpoints_list(client, user_auth_headers):
    response = client.get("/api/v1/endpoints", headers=user_auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_pause_and_resume_endpoint(client, user_auth_headers):
    # Create endpoint first
    create_res = client.post(
        "/api/v1/endpoints",
        json={
            "name": "Service To Pause",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
            "method": "GET"
        },
        headers=user_auth_headers
    )
    endpoint_id = create_res.json()["id"]

    # Pause
    pause_res = client.post(f"/api/v1/endpoints/{endpoint_id}/pause", headers=user_auth_headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["is_active"] is False
    assert pause_res.json()["status"] == "paused"

    # Resume
    resume_res = client.post(f"/api/v1/endpoints/{endpoint_id}/resume", headers=user_auth_headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["is_active"] is True


def test_delete_endpoint(client, user_auth_headers):
    create_res = client.post(
        "/api/v1/endpoints",
        json={
            "name": "Temporary Endpoint",
            "url": "http://127.0.0.1:8000/api/v1/mock-targets/healthy",
            "method": "GET"
        },
        headers=user_auth_headers
    )
    endpoint_id = create_res.json()["id"]

    del_res = client.delete(f"/api/v1/endpoints/{endpoint_id}", headers=user_auth_headers)
    assert del_res.status_code == 204

    # Verify not found
    get_res = client.get(f"/api/v1/endpoints/{endpoint_id}", headers=user_auth_headers)
    assert get_res.status_code == 404
