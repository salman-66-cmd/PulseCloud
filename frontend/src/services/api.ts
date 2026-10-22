import axios from 'axios';
import {
  User,
  Endpoint,
  CheckResult,
  Incident,
  IncidentTimeline,
  AlertRule,
  AlertEvent,
  OverviewSummary,
  LatencyPercentiles,
  StatusCodeDistribution,
  LatencyPoint,
  ReportJob
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses for auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and optionally redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: any) => api.post<{ access_token: string; token_type: string; user: User }>('/auth/login', data),
  register: (data: any) => api.post<{ access_token: string; token_type: string; user: User }>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
  updateMe: (data: any) => api.patch<User>('/auth/me', data),
  getTeam: () => api.get<User[]>('/auth/team'),
};

export const endpointsApi = {
  getAll: (params?: { search?: string; environment?: string; status?: string; tag?: string }) =>
    api.get<Endpoint[]>('/endpoints', { params }),
  getById: (id: number) => api.get<Endpoint>(`/endpoints/${id}`),
  create: (data: Partial<Endpoint>) => api.post<Endpoint>('/endpoints', data),
  update: (id: number, data: Partial<Endpoint>) => api.patch<Endpoint>(`/endpoints/${id}`, data),
  delete: (id: number) => api.delete(`/endpoints/${id}`),
  checkNow: (id: number) => api.post<CheckResult>(`/endpoints/${id}/check`),
  pause: (id: number) => api.post<Endpoint>(`/endpoints/${id}/pause`),
  resume: (id: number) => api.post<Endpoint>(`/endpoints/${id}/resume`),
};

export const checksApi = {
  getAll: (params?: { endpoint_id?: number; outcome?: string; is_success?: boolean; page?: number; limit?: number }) =>
    api.get<{ items: CheckResult[]; total: number; page: number; limit: number; pages: number }>('/checks', { params }),
  getById: (id: number) => api.get<CheckResult>(`/checks/${id}`),
  getByEndpoint: (endpointId: number, params?: { page?: number; limit?: number }) =>
    api.get<{ items: CheckResult[]; total: number; page: number; limit: number; pages: number }>(`/checks/endpoints/${endpointId}/checks`, { params }),
};

export const incidentsApi = {
  getAll: (params?: { endpoint_id?: number; status?: string; severity?: string }) =>
    api.get<Incident[]>('/incidents', { params }),
  getById: (id: number) => api.get<Incident>(`/incidents/${id}`),
  acknowledge: (id: number, note?: string) => api.post<Incident>(`/incidents/${id}/acknowledge`, { note }),
  resolve: (id: number, data: { resolution_notes: string; root_cause?: string }) =>
    api.post<Incident>(`/incidents/${id}/resolve`, data),
  addNote: (id: number, message: string) => api.post<IncidentTimeline>(`/incidents/${id}/notes`, { message }),
};

export const alertsApi = {
  getEvents: (params?: { endpoint_id?: number; is_read?: boolean; status?: string }) =>
    api.get<AlertEvent[]>('/alerts', { params }),
  markRead: (eventId: number) => api.patch<AlertEvent>(`/alerts/events/${eventId}/read`),
  markAllRead: () => api.post<{ marked_read_count: number }>('/alerts/events/read-all'),
  getRules: (endpointId?: number) => api.get<AlertRule[]>('/alerts/rules', { params: { endpoint_id: endpointId } }),
  createRule: (data: Partial<AlertRule>) => api.post<AlertRule>('/alerts/rules', data),
  updateRule: (id: number, data: Partial<AlertRule>) => api.patch<AlertRule>(`/alerts/rules/${id}`, data),
  deleteRule: (id: number) => api.delete(`/alerts/rules/${id}`),
};

export const analyticsApi = {
  getSummary: (hours: number = 24) => api.get<OverviewSummary>('/analytics/summary', { params: { hours } }),
  getUptime: (params?: { endpoint_id?: number; hours?: number }) => api.get<any>('/analytics/uptime', { params }),
  getLatency: (params?: { endpoint_id?: number; hours?: number }) =>
    api.get<LatencyPercentiles>('/analytics/latency', { params }),
  getStatusCodes: (params?: { endpoint_id?: number; hours?: number }) =>
    api.get<StatusCodeDistribution[]>('/analytics/status-codes', { params }),
  getTimeline: (params?: { endpoint_id?: number; hours?: number }) =>
    api.get<LatencyPoint[]>('/analytics/timeline', { params }),
};

export const reportsApi = {
  create: (data: { title: string; report_type: string; format: string }) =>
    api.post<ReportJob>('/reports', data),
  getAll: () => api.get<ReportJob[]>('/reports'),
  getById: (id: number) => api.get<ReportJob>(`/reports/${id}`),
  downloadUrl: (id: number) => `/api/v1/reports/${id}/download`,
};

export const systemApi = {
  health: () => api.get('/system/health'),
  ready: () => api.get('/system/ready'),
  seedDemo: () => api.post('/system/seed-demo'),
};

export default api;
