import React, { useState, useEffect } from 'react';
import {
  Radio,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Activity,
  Server,
  ArrowRight
} from 'lucide-react';
import { endpointsApi, checksApi } from '../services/api';
import { Endpoint, CheckResult } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const LiveMonitoring: React.FC = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [liveChecks, setLiveChecks] = useState<CheckResult[]>([]);
  const [checkingAll, setCheckingAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { showToast } = useToast();

  const loadLiveData = async () => {
    try {
      const [epRes, checksRes] = await Promise.all([
        endpointsApi.getAll(),
        checksApi.getAll({ limit: 15 }),
      ]);
      setEndpoints(epRes.data);
      setLiveChecks(checksRes.data.items);
    } catch {
      // Background poll
    }
  };

  useEffect(() => {
    loadLiveData();
    if (!autoRefresh) return;
    const interval = setInterval(loadLiveData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRunAll = async () => {
    setCheckingAll(true);
    try {
      for (const ep of endpoints.filter((e) => e.is_active)) {
        await endpointsApi.checkNow(ep.id);
      }
      showToast('All active endpoints checked successfully', 'success');
      loadLiveData();
    } catch {
      showToast('Batch health check encountered an error', 'error');
    } finally {
      setCheckingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Real-Time Monitoring</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Streaming health checks, sub-second latency verification, and live heartbeat telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-brand-blue focus:ring-blue-500"
            />
            <span>Live Auto-Poll (5s)</span>
          </label>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunAll}
            isLoading={checkingAll}
            leftIcon={<Zap className="w-4 h-4 text-cyan-300" />}
          >
            Check All Endpoints
          </Button>
        </div>
      </div>

      {/* Target Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {endpoints.map((ep) => {
          const isMock = ep.url.includes('/mock-targets/');
          return (
            <Card
              key={ep.id}
              className={`border transition-all duration-300 ${
                ep.status === 'healthy'
                  ? 'hover:border-emerald-400 bg-gradient-to-b from-white to-emerald-50/20'
                  : ep.status === 'degraded'
                  ? 'hover:border-amber-400 bg-gradient-to-b from-white to-amber-50/20'
                  : ep.status === 'down'
                  ? 'border-rose-300 bg-gradient-to-b from-white to-rose-50/30'
                  : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                      {ep.method}
                    </span>
                    <h3 className="font-semibold text-slate-800 text-sm">{ep.name}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 truncate block mt-1 max-w-[220px]">
                    {ep.url}
                  </span>
                </div>
                <Badge variant={ep.status as any} size="sm">
                  {ep.status}
                </Badge>
              </div>

              {/* Heartbeat Bar */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Response Time</span>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {ep.last_response_time_ms ? `${ep.last_response_time_ms} ms` : '—'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Status Code</span>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {ep.last_status_code || '—'}
                  </div>
                </div>
              </div>

              {/* Tag & Type Footer */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {ep.environment}
                </span>
                {isMock && (
                  <span className="text-[10px] font-mono font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    LOCAL SIMULATOR
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Live Stream Ticker */}
      <Card
        title="Live Monitoring Stream"
        subtitle="Incoming health check results executed by background workers"
      >
        <div className="space-y-2">
          {liveChecks.map((chk) => (
            <div
              key={chk.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{new Date(chk.timestamp).toLocaleTimeString()}</span>
                <span className={`w-2 h-2 rounded-full ${chk.is_success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="font-semibold text-slate-800">Endpoint #{chk.endpoint_id}</span>
                <span className="text-slate-500">{chk.outcome.toUpperCase()}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-700">{chk.duration_ms} ms</span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-800">
                  HTTP {chk.status_code || 'ERR'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
