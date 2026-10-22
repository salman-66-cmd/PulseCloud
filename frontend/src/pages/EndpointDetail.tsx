import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { endpointsApi, analyticsApi, checksApi, incidentsApi } from '../services/api';
import { Endpoint, CheckResult, Incident, LatencyPercentiles, LatencyPoint } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CardSkeleton } from '../components/common/Skeleton';
import { useToast } from '../context/ToastContext';

export const EndpointDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const endpointId = Number(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [latencyStats, setLatencyStats] = useState<LatencyPercentiles | null>(null);
  const [timeline, setTimeline] = useState<LatencyPoint[]>([]);
  const [uptime24h, setUptime24h] = useState<number>(100);
  const [uptime7d, setUptime7d] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadData = async () => {
    if (!endpointId) return;
    try {
      const [epRes, checksRes, incRes, latRes, tlRes, u24Res, u7dRes] = await Promise.all([
        endpointsApi.getById(endpointId),
        checksApi.getByEndpoint(endpointId, { limit: 20 }),
        incidentsApi.getAll({ endpoint_id: endpointId }),
        analyticsApi.getLatency({ endpoint_id: endpointId, hours: 24 }),
        analyticsApi.getTimeline({ endpoint_id: endpointId, hours: 24 }),
        analyticsApi.getUptime({ endpoint_id: endpointId, hours: 24 }),
        analyticsApi.getUptime({ endpoint_id: endpointId, hours: 168 }),
      ]);
      setEndpoint(epRes.data);
      setChecks(checksRes.data.items);
      setIncidents(incRes.data);
      setLatencyStats(latRes.data);
      setTimeline(tlRes.data);
      setUptime24h(u24Res.data.uptime_percentage);
      setUptime7d(u7dRes.data.uptime_percentage);
    } catch {
      showToast('Failed to load endpoint details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [endpointId]);

  const handleCheckNow = async () => {
    if (!endpointId) return;
    setChecking(true);
    try {
      const res = await endpointsApi.checkNow(endpointId);
      showToast(
        `Check finished: ${res.data.outcome.toUpperCase()} (${res.data.duration_ms}ms)`,
        res.data.is_success ? 'success' : 'error'
      );
      loadData();
    } catch {
      showToast('Manual check execution failed', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleTogglePause = async () => {
    if (!endpoint) return;
    try {
      if (endpoint.is_active) {
        await endpointsApi.pause(endpoint.id);
        showToast('Monitoring paused', 'info');
      } else {
        await endpointsApi.resume(endpoint.id);
        showToast('Monitoring resumed', 'success');
      }
      loadData();
    } catch {
      showToast('Failed to update endpoint state', 'error');
    }
  };

  if (loading && !endpoint) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Endpoint not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/endpoints')}>
          Back to Endpoints
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/endpoints')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                {endpoint.method}
              </span>
              <h1 className="text-xl font-bold text-slate-900">{endpoint.name}</h1>
              <Badge variant={endpoint.status as any}>{endpoint.status}</Badge>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5 truncate max-w-xl">{endpoint.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleTogglePause}>
            {endpoint.is_active ? (
              <>
                <Pause className="w-4 h-4 text-amber-500" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-500" />
                <span>Resume</span>
              </>
            )}
          </Button>

          <Button variant="primary" size="sm" onClick={handleCheckNow} isLoading={checking} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Check Now
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-semibold uppercase text-slate-500">24-Hour Uptime</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{uptime24h.toFixed(2)}%</div>
          <p className="text-[11px] text-slate-400 mt-1">7-Day Uptime: {uptime7d.toFixed(2)}%</p>
        </Card>

        <Card>
          <span className="text-xs font-semibold uppercase text-slate-500">Latest Response Time</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {endpoint.last_response_time_ms ? `${endpoint.last_response_time_ms} ms` : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Threshold: {endpoint.latency_threshold_ms} ms</p>
        </Card>

        <Card>
          <span className="text-xs font-semibold uppercase text-slate-500">95th Percentile (P95)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {latencyStats?.p95_ms || 0} ms
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Median (P50): {latencyStats?.median_ms || 0} ms</p>
        </Card>

        <Card>
          <span className="text-xs font-semibold uppercase text-slate-500">Check Interval</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {endpoint.check_interval_seconds} s
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Timeout: {endpoint.timeout_seconds}s</p>
        </Card>
      </div>

      {/* Latency Chart */}
      <Card title="Response Latency Trends" subtitle="Time-series response times over last 24 hours">
        <div className="h-64 w-full">
          {timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No telemetry data available for this endpoint yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="epGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <YAxis stroke="#94A3B8" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1C2541', borderRadius: '0.75rem', color: '#fff' }}
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                />
                <Area type="monotone" dataKey="avg_latency_ms" name="Average (ms)" stroke="#2563EB" strokeWidth={2} fill="url(#epGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Check History & Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check History Table */}
        <Card title="Recent Health Checks" subtitle="Latest 20 observations" className="lg:col-span-2" bodyClassName="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-6 py-3">Error / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checks.map((chk) => (
                <tr key={chk.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-3 font-mono text-slate-500">
                    {new Date(chk.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={chk.is_success ? 'healthy' : 'down'} size="sm">
                      {chk.outcome}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                    {chk.status_code || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono">{chk.duration_ms} ms</td>
                  <td className="px-6 py-3 text-slate-500 truncate max-w-xs">
                    {chk.error_message || 'OK'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Related Incidents */}
        <Card title="Incident Audit Trail" subtitle="Outages & recoveries for this endpoint">
          {incidents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              No incidents recorded for this endpoint.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge variant={inc.status === 'resolved' ? 'healthy' : 'down'} size="sm">
                      {inc.status}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(inc.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-1">{inc.title}</p>
                  {inc.resolution_notes && (
                    <p className="text-[11px] text-emerald-700 mt-1 bg-emerald-50 p-2 rounded">
                      {inc.resolution_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
