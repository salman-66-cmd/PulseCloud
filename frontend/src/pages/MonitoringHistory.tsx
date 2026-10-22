import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { checksApi, endpointsApi } from '../services/api';
import { CheckResult, Endpoint } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const MonitoringHistory: React.FC = () => {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [epsRes, checksRes] = await Promise.all([
        endpointsApi.getAll(),
        checksApi.getAll({
          endpoint_id: selectedEndpointId === 'all' ? undefined : Number(selectedEndpointId),
          outcome: outcomeFilter === 'All' ? undefined : outcomeFilter.toLowerCase(),
          page,
          limit: 25,
        }),
      ]);
      setEndpoints(epsRes.data);
      setChecks(checksRes.data.items);
      setTotalPages(checksRes.data.pages);
      setTotalCount(checksRes.data.total);
    } catch {
      showToast('Failed to load check history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEndpointId, outcomeFilter, page]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monitoring Check History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit log of health check executions, HTTP return codes, response latency, and error diagnoses. Total: {totalCount} checks.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedEndpointId}
            onChange={(e) => {
              setSelectedEndpointId(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Endpoints</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name}
              </option>
            ))}
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="All">All Outcomes</option>
            <option value="Success">Success</option>
            <option value="Degraded">Degraded</option>
            <option value="Failure">Failure</option>
            <option value="Timeout">Timeout</option>
            <option value="Connection_error">Connection Error</option>
            <option value="Ssrf_blocked">SSRF Blocked</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <Card bodyClassName="p-0 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Endpoint</th>
              <th className="px-4 py-3.5">Outcome</th>
              <th className="px-4 py-3.5">HTTP Status</th>
              <th className="px-4 py-3.5">Response Time</th>
              <th className="px-4 py-3.5">Resolved IP</th>
              <th className="px-4 py-3.5">Source</th>
              <th className="px-6 py-3.5">Error Message / Diagnosis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {checks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                  No monitoring records found for the selected criteria.
                </td>
              </tr>
            ) : (
              checks.map((chk) => (
                <tr key={chk.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-slate-500">
                    {new Date(chk.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">
                    Endpoint #{chk.endpoint_id}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={chk.is_success ? 'healthy' : 'down'} size="sm">
                      {chk.outcome}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                    {chk.status_code || '—'}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium text-slate-800">
                    {chk.duration_ms} ms
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                    {chk.resolved_ip || 'Internal'}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[10px] uppercase text-slate-400">
                    {chk.source}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 truncate max-w-sm">
                    {chk.error_message || (chk.is_success ? 'Health check passed' : 'Failed')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {totalPages || 1} ({totalCount} total entries)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
