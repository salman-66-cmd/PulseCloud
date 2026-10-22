from app.services.analytics import calculate_percentiles


def test_calculate_percentiles_empty():
    res = calculate_percentiles([])
    assert res["sample_count"] == 0
    assert res["is_statistically_reliable"] is False


def test_calculate_percentiles_values():
    # 25 samples
    samples = [10.0 + i * 2.0 for i in range(25)]
    res = calculate_percentiles(samples)
    assert res["sample_count"] == 25
    assert res["min_ms"] == 10.0
    assert res["max_ms"] == 58.0
    assert res["median_ms"] > 0
    assert res["p95_ms"] >= res["median_ms"]
    assert res["is_statistically_reliable"] is True


def test_analytics_api_endpoints(client, user_auth_headers):
    # Summary
    sum_res = client.get("/api/v1/analytics/summary", headers=user_auth_headers)
    assert sum_res.status_code == 200
    data = sum_res.json()
    assert "total_endpoints" in data
    assert "overall_uptime_percentage" in data

    # Uptime
    up_res = client.get("/api/v1/analytics/uptime", headers=user_auth_headers)
    assert up_res.status_code == 200
    assert "uptime_percentage" in up_res.json()

    # Latency
    lat_res = client.get("/api/v1/analytics/latency", headers=user_auth_headers)
    assert lat_res.status_code == 200
    assert "p95_ms" in lat_res.json()

    # Status codes
    sc_res = client.get("/api/v1/analytics/status-codes", headers=user_auth_headers)
    assert sc_res.status_code == 200
    assert isinstance(sc_res.json(), list)
