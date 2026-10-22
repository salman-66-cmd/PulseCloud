# Database Design & Schema Architecture

PulseCloud utilizes SQLAlchemy ORM with a normalized relational schema supporting PostgreSQL in production and SQLite for local development.

## Entity Relationship Overview

```
 [User] (1) ──────────< (N) [Endpoint] (1) ──────────< (N) [CheckResult]
   │                              │
   │                              ├──────────< (N) [Incident] (1) ──< (N) [IncidentTimeline]
   │                              │
   └──────────< (N) [AlertRule] (1) ─< (N) [AlertEvent]
   │
   └──────────< (N) [ReportJob]
```

## Tables & Schemas

### 1. `users`
- `id`: Integer, Primary Key
- `email`: String(255), Unique, Indexed
- `hashed_password`: String(255)
- `full_name`: String(255)
- `role`: String(50), Default "user" ("admin" or "user")
- `is_active`: Boolean, Default True
- `created_at`: DateTime (UTC)
- `updated_at`: DateTime (UTC)

### 2. `endpoints`
- `id`: Integer, Primary Key
- `user_id`: ForeignKey("users.id", CASCADE), Indexed
- `name`: String(255), Indexed
- `url`: String(2048)
- `method`: String(10), Default "GET"
- `headers_json`: Text (Nullable, JSON encoded)
- `body_payload`: Text (Nullable)
- `expected_status_codes`: String(100), Default "200"
- `check_interval_seconds`: Integer, Default 60
- `timeout_seconds`: Float, Default 10.0
- `environment`: String(50), Default "Production", Indexed
- `tags`: String(255)
- `is_active`: Boolean, Default True
- `status`: String(50), Indexed ("healthy", "degraded", "down", "unknown", "paused")
- `consecutive_failures`: Integer, Default 0
- `consecutive_successes`: Integer, Default 0
- `latency_threshold_ms`: Float, Default 800.0
- `json_body_assertion`: Text (Nullable)
- `last_checked_at`: DateTime (UTC, Nullable)
- `last_success_at`: DateTime (UTC, Nullable)
- `last_failure_at`: DateTime (UTC, Nullable)
- `last_response_time_ms`: Float (Nullable)
- `last_status_code`: Integer (Nullable)

### 3. `check_results`
- `id`: Integer, Primary Key
- `endpoint_id`: ForeignKey("endpoints.id", CASCADE), Indexed
- `timestamp`: DateTime (UTC), Indexed
- `duration_ms`: Float
- `status_code`: Integer (Nullable)
- `is_success`: Boolean, Indexed
- `outcome`: String(50), Indexed ("success", "degraded", "failure", "timeout", "connection_error", "ssrf_blocked")
- `error_category`: String(100)
- `error_message`: Text (Sanitized)
- `response_size_bytes`: Integer
- `resolved_ip`: String(100)
- `source`: String(50), Default "scheduled"
- Composite Indexes: `(endpoint_id, timestamp)`, `(endpoint_id, outcome)`

### 4. `incidents`
- `id`: Integer, Primary Key
- `endpoint_id`: ForeignKey("endpoints.id", CASCADE), Indexed
- `title`: String(255)
- `description`: Text
- `severity`: String(50), Default "high" ("critical", "high", "medium", "low")
- `status`: String(50), Indexed ("open", "acknowledged", "investigating", "resolved")
- `started_at`: DateTime (UTC), Indexed
- `resolved_at`: DateTime (UTC, Nullable)
- `acknowledged_at`: DateTime (UTC, Nullable)
- `acknowledged_by`: String(255)
- `root_cause`: String(255)
- `resolution_notes`: Text
- `affected_checks_count`: Integer, Default 1

### 5. `incident_timeline`
- `id`: Integer, Primary Key
- `incident_id`: ForeignKey("incidents.id", CASCADE), Indexed
- `timestamp`: DateTime (UTC)
- `event_type`: String(50) ("created", "acknowledged", "investigating", "note_added", "resolved", "reopened")
- `message`: Text
- `author`: String(255)

### 6. `alert_rules`
- `id`: Integer, Primary Key
- `user_id`: ForeignKey("users.id", CASCADE), Indexed
- `endpoint_id`: ForeignKey("endpoints.id", CASCADE, Nullable)
- `name`: String(255)
- `condition_type`: String(50) ("consecutive_failures", "latency_threshold", "status_code_mismatch", "downtime")
- `threshold_value`: Float
- `severity`: String(50)
- `is_enabled`: Boolean
- `cooldown_minutes`: Integer, Default 15
- `last_triggered_at`: DateTime (UTC, Nullable)

### 7. `alert_events`
- `id`: Integer, Primary Key
- `alert_rule_id`: ForeignKey("alert_rules.id", SET NULL, Nullable)
- `endpoint_id`: ForeignKey("endpoints.id", CASCADE), Indexed
- `title`: String(255)
- `message`: Text
- `severity`: String(50)
- `status`: String(50), Default "active"
- `is_read`: Boolean, Default False, Indexed
- `triggered_at`: DateTime (UTC), Indexed
- `resolved_at`: DateTime (UTC, Nullable)

### 8. `report_jobs`
- `id`: Integer, Primary Key
- `user_id`: ForeignKey("users.id", CASCADE), Indexed
- `title`: String(255)
- `report_type`: String(50) ("health", "uptime", "latency", "incidents", "environment_comparison")
- `status`: String(50), Default "completed"
- `format`: String(20), Default "csv"
- `date_from`: DateTime (UTC, Nullable)
- `date_to`: DateTime (UTC, Nullable)
- `file_content`: Text (Direct export content)
- `row_count`: Integer, Default 0
- `created_at`: DateTime (UTC)

## Data Retention & Pruning Strategy
- Check records older than `settings.CHECK_RETENTION_DAYS` (default 30 days) can be automatically purged or aggregated into hourly rollups.
- Incidents and audit logs are never deleted by check retention routines.
