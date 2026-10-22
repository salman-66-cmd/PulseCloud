import asyncio
import random
from typing import Any, Dict
from fastapi import APIRouter, Header, HTTPException, Request, Response

router = APIRouter()

# Global counter for flaky target
_flaky_counter = 0


@router.get("/healthy")
def mock_healthy_target():
    """Mock target that returns 200 OK rapidly (healthy baseline)."""
    return {
        "status": "online",
        "service": "pulsecloud-mock-target",
        "health": "excellent",
        "version": "v1.2.0"
    }


@router.get("/slow")
async def mock_slow_target():
    """Mock target that simulates a slow/degraded endpoint (1.2s delay)."""
    await asyncio.sleep(1.2)
    return {
        "status": "degraded_latency",
        "service": "pulsecloud-mock-slow-target",
        "warning": "Database query pool contention simulated",
        "latency_simulated_ms": 1200
    }


@router.get("/error")
def mock_error_target():
    """Mock target that returns 500 Internal Server Error to test incident creation."""
    raise HTTPException(
        status_code=500,
        detail="Simulated database connection failure (500 Internal Server Error)"
    )


@router.get("/flaky")
def mock_flaky_target():
    """Mock target that alternates between 200 OK and 503 Service Unavailable."""
    global _flaky_counter
    _flaky_counter += 1
    if _flaky_counter % 2 == 1:
        raise HTTPException(
            status_code=503,
            detail="Simulated transient outage (503 Service Unavailable)"
        )
    return {
        "status": "recovered",
        "attempt": _flaky_counter,
        "message": "Transient error resolved"
    }


@router.post("/payload")
async def mock_payload_target(request: Request):
    """Mock target that verifies POST payload and content."""
    body = await request.body()
    return {
        "status": "received",
        "bytes_received": len(body),
        "echo": body.decode("utf-8", errors="ignore")[:200]
    }


@router.get("/auth-test")
def mock_auth_target(authorization: str = Header(None)):
    """Mock target requiring API key or Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    return {"authenticated": True, "token_provided": authorization[:15] + "..."}
