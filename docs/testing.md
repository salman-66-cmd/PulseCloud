# Testing & Verification Guide

This document outlines the test strategy and instructions for running the test suites across backend, frontend, and load testing.

---

## 1. Backend Testing with Pytest

The backend test suite covers:
- Authentication & JWT token issuance (`test_auth.py`)
- SSRF prevention & IP validation (`test_ssrf.py`)
- Endpoint CRUD & state management (`test_endpoints.py`)
- Monitoring execution, latency timing, status code handling (`test_monitoring.py`)
- Automatic incident creation, duplicate prevention, and recovery (`test_incidents.py`)
- Latency percentiles (min, max, avg, median, p95, p99) and uptime (`test_analytics.py`)

### Run Backend Tests:
```bash
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

---

## 2. Frontend Unit Testing with Vitest

Tests UI components and React rendering:
```bash
cd frontend
cmd /c "npm test"
```

---

## 3. Production Frontend Type Checking & Build

Validates TypeScript types and Vite production bundle generation:
```bash
cd frontend
cmd /c "npm run build"
```

---

## 4. Load Testing with Locust

Simulates concurrent dashboard operators, API queries, and monitoring checks:
```bash
cd scripts
..\backend\venv\Scripts\locust.exe -f load_test.py --host http://127.0.0.1:8000
```
Open web UI at `http://localhost:8089` to initiate simulated user load.
