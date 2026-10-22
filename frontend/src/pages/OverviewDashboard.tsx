import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  AlertOctagon,
  RefreshCw,
  Plus,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Radio
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { analyticsApi, endpointsApi, incidentsApi } from '../services/api';
import { OverviewSummary, Endpoint, Incident, StatusCodeDistribution, LatencyPoint } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CardSkeleton } from '../components/common/Skeleton';
import { EndpointModal } from '../components/modals/EndpointModal';
import { useToast } from '../context/ToastContext';

export const OverviewDashboard: React.FC = () => {
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusCodes, setStatusCodes] = useState<StatusCodeDistribution[]>([]);
  const [timeline, setTimeline] = useState<LatencyPoint[]>([]);
  const [hours, setHours] = useState<number>(24);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingEndpointId, setCheckingEndpointId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [sumRes, epRes, incRes, scRes, tlRes] = await Promise.all([
        analyticsApi.getSummary(hours),
        endpointsApi.getAll(),
        incidentsApi.getAll({ status: 'open' }),
        analyticsApi.getStatusCodes({ hours }),
        analyticsApi.getTimeline({ hours }),
      ]);
      setSummary(sumRes.data);
      setEndpoints(epRes.data);
      setIncidents(incRes.data);
      setStatusCodes(scRes.data);
      setTimeline(tlRes.data);
    } catch (err: any) {
      showToast('Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [hours]);

  const handleCheckNow = async (endpointId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingEndpointId(endpointId);
    try {
      const res = await endpointsApi.checkNow(endpointId);
      showToast(
        `Check complete: ${res.data.outcome.toUpperCase()} (${res.data.duration_ms}ms)`,
        res.data.is_success ? 'success' : 'error'
      );
      loadData();
    } catch {
      showToast('Manual check execution failed', 'error');
    } finally {
      setCheckingEndpointId(null);
    }
  };

  const handleCreateEndpoint = async (data: any) => {
    try {
      await endpointsApi.create(data);
      showToast('Endpoint registered successfully', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to register endpoint', 'error');
    }
  };

  const COLORS = ['#10B981', '#06B6D4', '#2563EB', '#F59E0B', '#F43F5E', '#8B5CF6'];

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            Cloud API Health & Overview
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry across {summary?.total_endpoints || 0} monitored APIs. Observation window: Last {hours} hours ({summary?.sample_checks_count || 0} checks).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs text-xs font-medium">
            <button
              onClick={() => setHours(24)}
              className={`px-3 py-1.5 rounded-md transition-colors ${hours === 24 ? 'bg-navy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setHours(168)}
              className={`px-3 py-1.5 rounded-md transition-colors ${hours === 168 ? 'bg-navy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setHours(720)}
              className={`px-3 py-1.5 rounded-md transition-colors ${hours === 720 ? 'bg-navy-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              30 Days
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add API
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Endpoints */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Endpoints</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.total_endpoints || 0}</span>
            <span className="text-xs font-medium text-slate-500">APIs monitored</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {summary?.healthy_endpoints || 0} Healthy
            </span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{summary?.degraded_endpoints || 0} Degraded</span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">{summary?.down_endpoints || 0} Down</span>
          </div>
        </Card>

        {/* Overall Monitored Uptime */}
        <Card className="hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Measured Uptime</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.overall_uptime_percentage?.toFixed(2) || '100.00'}%</span>
            <span className={`text-xs font-medium flex items-center gap-0.5 ${(summary?.overall_uptime_percentage || 0) >= 99 ? 'text-emerald-600' : 'text-amber-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" /> High Availability
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 truncate">
            Based on {summary?.sample_checks_count || 0} checks executed over {hours}h
          </p>
        </Card>

        {/* Avg Latency */}
        <Card className="hover:border-cyan-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Response Time</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary?.average_response_time_ms || 0}</span>
            <span className="text-sm font-semibold text-slate-500">ms</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Latency SLA Target: &lt;500ms</span>
            <span className="text-emerald-600 font-medium">Optimal</span>
          </div>
        </Card>

        {/* Active Incidents & Checks Today */}
        <Card className="hover:border-rose-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Incidents</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${(summary?.active_incidents_count || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {summary?.active_incidents_count || 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Open outages</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Checks executed today:</span>
            <span className="font-semibold text-slate-700">{summary?.checks_executed_today || 0}</span>
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency Trends Area Chart */}
        <Card
          title="Latency & Response Time Trends"
          subtitle={`Average & 95th Percentile Response Time (ms) over ${hours}h`}
          className="lg:col-span-2"
        >
          <div className="h-72 w-full">
            {timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Collecting telemetry data points...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
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
                  <Area type="monotone" dataKey="avg_latency_ms" name="Average Latency" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#latencyGradient)" />
                  <Area type="monotone" dataKey="p95_latency_ms" name="P95 Latency" stroke="#7C3AED" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#p95Gradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* HTTP Status Code Distribution */}
        <Card
          title="Status Code Distribution"
          subtitle="Observed HTTP return codes & timeouts"
        >
          <div className="h-56 w-full flex items-center justify-center">
            {statusCodes.length === 0 ? (
              <p className="text-slate-400 text-sm">No status codes logged</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCodes}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status_code"
                  >
                    {statusCodes.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B132B', borderColor: '#1C2541', borderRadius: '0.75rem', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
            {statusCodes.map((sc, i) => (
              <div key={sc.status_code} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {sc.status_code}
                </span>
                <span className="font-semibold text-slate-800">{sc.percentage}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tables Row: Endpoints Status & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoints Table */}
        <Card
          title="Monitored Endpoint Health"
          subtitle="Live status, latency, and immediate manual check trigger"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/endpoints')} rightIcon={<ArrowUpRight className="w-4 h-4" />}>
              View All
            </Button>
          }
          className="lg:col-span-2"
          bodyClassName="p-0 overflow-x-auto"
        >
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">API Endpoint</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Environment</th>
                <th className="px-4 py-3.5">Last Latency</th>
                <th className="px-4 py-3.5">Last Checked</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {endpoints.slice(0, 6).map((ep) => (
                <tr
                  key={ep.id}
                  onClick={() => navigate(`/endpoints/${ep.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3.5 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-semibold">
                        {ep.method}
                      </span>
                      <span className="truncate max-w-xs">{ep.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={ep.status as any}>{ep.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">{ep.environment}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-700">
                    {ep.last_response_time_ms ? `${ep.last_response_time_ms} ms` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {ep.last_checked_at ? new Date(ep.last_checked_at).toLocaleTimeString() : 'Pending'}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={checkingEndpointId === ep.id}
                      onClick={(e) => handleCheckNow(ep.id, e)}
                    >
                      Check Now
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Active Incidents Panel */}
        <Card
          title="Active Outages & Incidents"
          subtitle="Alert triggers requiring investigation"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')} rightIcon={<ArrowUpRight className="w-4 h-4" />}>
              All Incidents
            </Button>
          }
        >
          {incidents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No Active Outages</p>
              <p className="text-slate-500 mt-1">All monitored systems are functioning within normal operational limits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate('/incidents')}
                  className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="down" size="sm">{inc.severity}</Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(inc.started_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-xs mt-2 truncate">{inc.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {inc.description || 'Consecutive threshold checks failed.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Endpoint Add Modal */}
      <EndpointModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateEndpoint}
      />
    </div>
  );
};
