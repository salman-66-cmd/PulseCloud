# PulseCloud REST API Documentation

The PulseCloud REST API is structured under `/api/v1` with JSON payloads and standard HTTP status codes. Interactive API documentation is available via FastAPI Swagger UI at `http://127.0.0.1:8000/docs`.

## Authentication & Authorization

All protected endpoints require an `Authorization: Bearer <JWT>` header.

### Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user (JSON) | Public |
| `POST` | `/api/v1/auth/login/form` | OAuth2 form login for Swagger | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Protected |
| `PATCH` | `/api/v1/auth/me` | Update user profile or password | Protected |
| `GET` | `/api/v1/auth/team` | List team members | Protected |

---

## Monitored Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/endpoints` | List endpoints (with search, status, env filters) | Protected |
| `POST` | `/api/v1/endpoints` | Register new monitored endpoint | Protected |
| `GET` | `/api/v1/endpoints/{id}` | Retrieve endpoint details & health telemetry | Protected |
| `PATCH` | `/api/v1/endpoints/{id}` | Update endpoint configuration | Protected |
| `DELETE` | `/api/v1/endpoints/{id}` | Delete endpoint and history | Protected |
| `POST` | `/api/v1/endpoints/{id}/check` | Trigger an immediate manual health check | Protected |
| `POST` | `/api/v1/endpoints/{id}/pause` | Pause automatic health checks | Protected |
| `POST` | `/api/v1/endpoints/{id}/resume` | Resume automatic health checks | Protected |

---

## Checks & History

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/checks` | Paginated check records with filters | Protected |
| `GET` | `/api/v1/checks/{id}` | Get specific check detail | Protected |
| `GET` | `/api/v1/checks/endpoints/{id}/checks` | Get check history for an endpoint | Protected |

---

## Incidents & Recovery

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/incidents` | List incidents with status/severity filters | Protected |
| `GET` | `/api/v1/incidents/{id}` | Retrieve incident detail and audit timeline | Protected |
| `POST` | `/api/v1/incidents/{id}/acknowledge` | Acknowledge incident with investigation note | Protected |
| `POST` | `/api/v1/incidents/{id}/resolve` | Resolve incident with root cause analysis | Protected |
| `POST` | `/api/v1/incidents/{id}/notes` | Append investigation note to timeline | Protected |

---

## Alerts & Rules

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/alerts` | List in-app alert events | Protected |
| `PATCH` | `/api/v1/alerts/events/{id}/read` | Mark alert notification as read | Protected |
| `POST` | `/api/v1/alerts/events/read-all` | Mark all user alerts as read | Protected |
| `GET` | `/api/v1/alerts/rules` | List alert trigger rules | Protected |
| `POST` | `/api/v1/alerts/rules` | Create alert trigger rule with cooldown | Protected |
| `PATCH` | `/api/v1/alerts/rules/{id}` | Update alert rule parameters | Protected |
| `DELETE` | `/api/v1/alerts/rules/{id}` | Delete alert rule | Protected |

---

## Analytics & Reports

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/analytics/summary` | Get overview dashboard summary KPIs | Protected |
| `GET` | `/api/v1/analytics/uptime` | Calculate 24h, 7d, 30d uptime metrics | Protected |
| `GET` | `/api/v1/analytics/latency` | Calculate min, max, avg, p50, p95, p99 | Protected |
| `GET` | `/api/v1/analytics/status-codes` | Status code breakdown percentages | Protected |
| `GET` | `/api/v1/analytics/timeline` | Time-series latency chart data | Protected |
| `POST` | `/api/v1/reports` | Create asynchronous report export job | Protected |
| `GET` | `/api/v1/reports` | List generated reports | Protected |
| `GET` | `/api/v1/reports/{id}/download` | Download CSV or JSON report | Protected |

---

## System Diagnostics & Mock Targets

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/system/health` | Liveness health check | Public |
| `GET` | `/api/v1/system/ready` | Database readiness check | Public |
| `POST` | `/api/v1/system/seed-demo` | Seed realistic demo endpoints and history | Public |
| `GET` | `/api/v1/mock-targets/healthy` | Local test target: 200 OK fast (~20ms) | Public |
| `GET` | `/api/v1/mock-targets/slow` | Local test target: 200 OK degraded (~1.2s) | Public |
| `GET` | `/api/v1/mock-targets/error` | Local test target: 500 Server Error | Public |
| `GET` | `/api/v1/mock-targets/flaky` | Local test target: Alternates 200/503 | Public |
| `POST` | `/api/v1/mock-targets/payload` | Local test target: Payload echo | Public |
