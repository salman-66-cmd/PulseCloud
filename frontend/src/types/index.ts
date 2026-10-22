export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface Endpoint {
  id: number;
  user_id: number;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE';
  headers_json?: string;
  body_payload?: string;
  expected_status_codes: string;
  check_interval_seconds: number;
  timeout_seconds: number;
  environment: 'Production' | 'Staging' | 'Development' | 'Internal';
  tags?: string;
  is_active: boolean;
  status: 'healthy' | 'degraded' | 'down' | 'unknown' | 'paused';
  consecutive_failures: number;
  consecutive_successes: number;
  latency_threshold_ms: number;
  json_body_assertion?: string;
  last_checked_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
  last_response_time_ms?: number;
  last_status_code?: number;
  created_at: string;
  updated_at?: string;
}

export interface CheckResult {
  id: number;
  endpoint_id: number;
  timestamp: string;
  duration_ms: number;
  status_code?: number;
  is_success: boolean;
  outcome: 'success' | 'degraded' | 'failure' | 'timeout' | 'connection_error' | 'ssrf_blocked';
  error_category?: string;
  error_message?: string;
  response_size_bytes: number;
  resolved_ip?: string;
  source: string;
}

export interface IncidentTimeline {
  id: number;
  incident_id: number;
  timestamp: string;
  event_type: 'created' | 'acknowledged' | 'investigating' | 'note_added' | 'resolved' | 'reopened';
  message: string;
  author: string;
}

export interface Incident {
  id: number;
  endpoint_id: number;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved';
  started_at: string;
  resolved_at?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  root_cause?: string;
  resolution_notes?: string;
  affected_checks_count: number;
  timeline_events?: IncidentTimeline[];
}

export interface AlertRule {
  id: number;
  user_id: number;
  endpoint_id?: number;
  name: string;
  condition_type: 'consecutive_failures' | 'latency_threshold' | 'status_code_mismatch' | 'downtime';
  threshold_value: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  is_enabled: boolean;
  cooldown_minutes: number;
  last_triggered_at?: string;
  created_at: string;
}

export interface AlertEvent {
  id: number;
  alert_rule_id?: number;
  endpoint_id: number;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  is_read: boolean;
  triggered_at: string;
  resolved_at?: string;
}

export interface OverviewSummary {
  total_endpoints: number;
  healthy_endpoints: number;
  degraded_endpoints: number;
  down_endpoints: number;
  paused_endpoints: number;
  unknown_endpoints: number;
  average_response_time_ms: number;
  overall_uptime_percentage: number;
  active_incidents_count: number;
  checks_executed_today: number;
  period_hours: number;
  sample_checks_count: number;
}

export interface LatencyPercentiles {
  sample_count: number;
  min_ms: number;
  max_ms: number;
  avg_ms: number;
  median_ms: number;
  p95_ms: number;
  p99_ms: number;
  is_statistically_reliable: boolean;
}

export interface StatusCodeDistribution {
  status_code: string;
  count: number;
  percentage: number;
}

export interface LatencyPoint {
  timestamp: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  error_count: number;
  check_count: number;
}

export interface ReportJob {
  id: number;
  user_id: number;
  title: string;
  report_type: 'health' | 'uptime' | 'latency' | 'incidents' | 'environment_comparison';
  status: 'pending' | 'completed' | 'failed';
  format: 'csv' | 'json';
  date_from?: string;
  date_to?: string;
  row_count: number;
  created_at: string;
}
