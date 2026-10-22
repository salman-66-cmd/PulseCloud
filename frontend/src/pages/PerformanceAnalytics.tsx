import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { analyticsApi, endpointsApi } from '../services/api';
import { Endpoint, LatencyPercentiles, LatencyPoint } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const PerformanceAnalytics: React.FC = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('all');
  const [hours, setHours] = useState<number>(24);
  const [latencyStats, setLatencyStats] = useState<LatencyPercentiles | null>(null);
  const [timeline, setTimeline] = useState<LatencyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const epParam = selectedEndpointId === 'all' ? undefined : Number(selectedEndpointId);
      const [epsRes, latRes, tlRes] = await Promise.all([
        endpointsApi.getAll(),
        analyticsApi.getLatency({ endpoint_id: epParam, hours }),
        analyticsApi.getTimeline({ endpoint_id: epParam, hours }),
      ]);
      setEndpoints(epsRes.data);
      setLatencyStats(latRes.data);
      setTimeline(tlRes.data);
    } catch {
      showToast('Failed to load performance analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedEndpointId, hours]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance & Latency Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quantile distributions, p50/p95/p99 percentiles, and SLA latency boundaries.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedEndpointId}
            onChange={(e) => setSelectedEndpointId(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Monitored Endpoints</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name} ({ep.environment})
              </option>
            ))}
          </select>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs text-xs font-medium">
            <button
              onClick={() => setHours(24)}
              className={`px-3 py-1.5 rounded-md ${hours === 24 ? 'bg-navy-900 text-white' : 'text-slate-600'}`}
            >
              24h
            </button>
            <button
              onClick={() => setHours(168)}
              className={`px-3 py-1.5 rounded-md ${hours === 168 ? 'bg-navy-900 text-white' : 'text-slate-600'}`}
            >
              7d
            </button>
            <button
              onClick={() => setHours(720)}
              className={`px-3 py-1.5 rounded-md ${hours === 720 ? 'bg-navy-900 text-white' : 'text-slate-600'}`}
            >
              30d
            </button>
          </div>
        </div>
      </div>

      {/* Latency Quantile Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4" bodyClassName="p-0">
          <span className="text-[10px] font-bold uppercase text-slate-400">Minimum (Min)</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{latencyStats?.min_ms || 0} ms</div>
          <span className="text-[10px] text-slate-500">Fastest response</span>
        </Card>

        <Card className="p-4" bodyClassName="p-0">
          <span className="text-[10px] font-bold uppercase text-slate-400">Median (P50)</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{latencyStats?.median_ms || 0} ms</div>
          <span className="text-[10px] text-slate-500">50th percentile</span>
        </Card>

        <Card className="p-4" bodyClassName="p-0">
          <span className="text-[10px] font-bold uppercase text-slate-400">Average (Mean)</span>
          <div className="text-xl font-bold text-brand-blue mt-1 font-mono">{latencyStats?.avg_ms || 0} ms</div>
          <span className="text-[10px] text-slate-500">Arithmetic average</span>
        </Card>

        <Card className="p-4" bodyClassName="p-0">
          <span className="text-[10px] font-bold uppercase text-slate-400">95th Percentile</span>
          <div className="text-xl font-bold text-violet-600 mt-1 font-mono">{latencyStats?.p95_ms || 0} ms</div>
          <span className="text-[10px] text-slate-500">Tail latency (P95)</span>
        </Card>

        <Card className="p-4" bodyClassName="p-0">
          <span className="text-[10px] font-bold uppercase text-slate-400">99th Percentile</span>
          <div className="text-xl font-bold text-rose-600 mt-1 font-mono">{latencyStats?.p99_ms || 0} ms</div>
          <span className="text-[10px] text-slate-500">Extreme tail (P99)</span>
        </Card>

        <Card className="p-4" bodyClassName="p-0">
          <span className="text-[10px] font-bold uppercase text-slate-400">Sample Count</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{latencyStats?.sample_count || 0}</div>
          <span className={`text-[10px] font-semibold ${latencyStats?.is_statistically_reliable ? 'text-emerald-600' : 'text-amber-600'}`}>
            {latencyStats?.is_statistically_reliable ? '✓ Statistically Reliable' : '⚠️ Small Sample'}
          </span>
        </Card>
      </div>

      {/* Main Latency Chart */}
      <Card
        title="High-Resolution Latency Trends"
        subtitle={`Response duration over ${hours}h with Average vs P95 bounds`}
      >
        <div className="h-80 w-full">
          {timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No latency observations found for selected filter.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="p95G" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="avgG" x1="0" y1="0" x2="0" y2="1">
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
                <Legend />
                <Area type="monotone" dataKey="p95_latency_ms" name="P95 Latency (ms)" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 5" fill="url(#p95G)" />
                <Area type="monotone" dataKey="avg_latency_ms" name="Average Latency (ms)" stroke="#2563EB" strokeWidth={2} fill="url(#avgG)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};
