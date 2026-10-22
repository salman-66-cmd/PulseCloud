import time
import json
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.ssrf import validate_url_safety, SSRFValidationError
from app.models.endpoint import Endpoint


async def execute_http_check(
    endpoint: Endpoint,
    source: str = "scheduled"
) -> Dict[str, Any]:
    """
    Executes an HTTP/HTTPS health check on a target endpoint.
    Includes SSRF validation, DNS verification, latency measurement,
    status code inspection, and optional response body assertion.
    """
    url = endpoint.url.strip()
    method = (endpoint.method or "GET").upper()
    timeout = float(endpoint.timeout_seconds or settings.REQUEST_DEFAULT_TIMEOUT)
    expected_status_str = endpoint.expected_status_codes or "200"
    expected_status_codes = [int(s.strip()) for s in expected_status_str.split(",") if s.strip().isdigit()]
    if not expected_status_codes:
        expected_status_codes = [200]

    # 1. SSRF Safety Check
    is_safe, ssrf_reason, resolved_ips = validate_url_safety(url)
    if not is_safe:
        return {
            "endpoint_id": endpoint.id,
            "timestamp": datetime.now(timezone.utc),
            "duration_ms": 0.0,
            "status_code": None,
            "is_success": False,
            "outcome": "ssrf_blocked",
            "error_category": "SSRF_VIOLATION",
            "error_message": f"Blocked by SSRF protection: {ssrf_reason}",
            "response_size_bytes": 0,
            "resolved_ip": resolved_ips[0] if resolved_ips else None,
            "source": source
        }

    resolved_ip = resolved_ips[0] if resolved_ips and resolved_ips[0] != "allowlist" else None

    # Parse custom headers
    headers: Dict[str, str] = {
        "User-Agent": "PulseCloud-Monitor/1.0 (+https://pulsecloud.local/bot)",
        "Accept": "*/*"
    }
    if endpoint.headers_json:
        try:
            custom_headers = json.loads(endpoint.headers_json)
            if isinstance(custom_headers, dict):
                headers.update(custom_headers)
        except Exception:
            pass

    # Safe payload parsing for POST/PUT
    data = None
    if method in ("POST", "PUT") and endpoint.body_payload:
        data = endpoint.body_payload

    start_perf = time.perf_counter()
    check_time = datetime.now(timezone.utc)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(timeout, connect=timeout)
        ) as client:
            request_kwargs = {
                "method": method,
                "url": url,
                "headers": headers,
            }
            if data:
                request_kwargs["content"] = data

            response = await client.request(**request_kwargs)
            elapsed_ms = round((time.perf_counter() - start_perf) * 1000.0, 2)
            status_code = response.status_code
            content_bytes = response.content[:settings.MAX_RESPONSE_BODY_BYTES]
            response_size = len(response.content)

            # Evaluate expected status code
            status_matched = status_code in expected_status_codes

            # Evaluate optional JSON assertion
            assertion_passed = True
            assertion_error = None
            if endpoint.json_body_assertion and status_matched:
                try:
                    expected_json = json.loads(endpoint.json_body_assertion)
                    if isinstance(expected_json, dict):
                        response_json = response.json()
                        for k, v in expected_json.items():
                            if response_json.get(k) != v:
                                assertion_passed = False
                                assertion_error = f"Key '{k}' expected '{v}' but received '{response_json.get(k)}'"
                                break
                except Exception as ex:
                    assertion_passed = False
                    assertion_error = f"JSON assertion validation failed: {str(ex)}"

            # Classify outcome
            if not status_matched:
                if status_code >= 500:
                    outcome = "failure"
                    error_category = "HTTP_SERVER_ERROR"
                    error_message = f"Received HTTP {status_code} (expected {expected_status_str})"
                else:
                    outcome = "degraded"
                    error_category = "HTTP_STATUS_MISMATCH"
                    error_message = f"Received HTTP {status_code} (expected {expected_status_str})"
                is_success = False
            elif not assertion_passed:
                outcome = "failure"
                error_category = "ASSERTION_FAILED"
                error_message = assertion_error
                is_success = False
            elif elapsed_ms > endpoint.latency_threshold_ms:
                # Reachable and expected status, but latency degraded
                outcome = "degraded"
                error_category = "LATENCY_DEGRADED"
                error_message = f"Latency {elapsed_ms}ms exceeded threshold {endpoint.latency_threshold_ms}ms"
                is_success = True  # Endpoint is up, but degraded
            else:
                outcome = "success"
                error_category = None
                error_message = None
                is_success = True

            return {
                "endpoint_id": endpoint.id,
                "timestamp": check_time,
                "duration_ms": elapsed_ms,
                "status_code": status_code,
                "is_success": is_success,
                "outcome": outcome,
                "error_category": error_category,
                "error_message": error_message,
                "response_size_bytes": response_size,
                "resolved_ip": resolved_ip,
                "source": source
            }

    except httpx.TimeoutException:
        elapsed_ms = round((time.perf_counter() - start_perf) * 1000.0, 2)
        return {
            "endpoint_id": endpoint.id,
            "timestamp": check_time,
            "duration_ms": elapsed_ms,
            "status_code": None,
            "is_success": False,
            "outcome": "timeout",
            "error_category": "REQUEST_TIMEOUT",
            "error_message": f"Connection timed out after {timeout}s",
            "response_size_bytes": 0,
            "resolved_ip": resolved_ip,
            "source": source
        }
    except (httpx.ConnectError, httpx.NetworkError) as ex:
        elapsed_ms = round((time.perf_counter() - start_perf) * 1000.0, 2)
        return {
            "endpoint_id": endpoint.id,
            "timestamp": check_time,
            "duration_ms": elapsed_ms,
            "status_code": None,
            "is_success": False,
            "outcome": "connection_error",
            "error_category": "CONNECTION_FAILED",
            "error_message": f"Network connection failed: {str(ex)[:150]}",
            "response_size_bytes": 0,
            "resolved_ip": resolved_ip,
            "source": source
        }
    except Exception as ex:
        elapsed_ms = round((time.perf_counter() - start_perf) * 1000.0, 2)
        return {
            "endpoint_id": endpoint.id,
            "timestamp": check_time,
            "duration_ms": elapsed_ms,
            "status_code": None,
            "is_success": False,
            "outcome": "failure",
            "error_category": "UNEXPECTED_ERROR",
            "error_message": f"Unexpected check error: {str(ex)[:150]}",
            "response_size_bytes": 0,
            "resolved_ip": resolved_ip,
            "source": source
        }
