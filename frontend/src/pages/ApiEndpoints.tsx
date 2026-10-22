import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Edit,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { endpointsApi } from '../services/api';
import { Endpoint } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { EndpointModal } from '../components/modals/EndpointModal';
import { useToast } from '../context/ToastContext';

export const ApiEndpoints: React.FC = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [environment, setEnvironment] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [deleteEndpointId, setDeleteEndpointId] = useState<number | null>(null);
  const [checkingEndpointId, setCheckingEndpointId] = useState<number | null>(null);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadEndpoints = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (environment !== 'All') params.environment = environment;
      if (statusFilter !== 'All') params.status = statusFilter.toLowerCase();

      const res = await endpointsApi.getAll(params);
      setEndpoints(res.data);
    } catch {
      showToast('Failed to load endpoints', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEndpoints();
  }, [environment, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEndpoints();
  };

  const handleSaveEndpoint = async (data: any) => {
    try {
      if (selectedEndpoint) {
        await endpointsApi.update(selectedEndpoint.id, data);
        showToast('Endpoint updated successfully', 'success');
      } else {
        await endpointsApi.create(data);
        showToast('Endpoint registered successfully', 'success');
      }
      setIsModalOpen(false);
      setSelectedEndpoint(null);
      loadEndpoints();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save endpoint', 'error');
    }
  };

  const handleTogglePause = async (ep: Endpoint, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (ep.is_active) {
        await endpointsApi.pause(ep.id);
        showToast(`Monitoring paused for ${ep.name}`, 'info');
      } else {
        await endpointsApi.resume(ep.id);
        showToast(`Monitoring resumed for ${ep.name}`, 'success');
      }
      loadEndpoints();
    } catch {
      showToast('Failed to toggle monitoring status', 'error');
    }
  };

  const handleCheckNow = async (endpointId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingEndpointId(endpointId);
    try {
      const res = await endpointsApi.checkNow(endpointId);
      showToast(
        `Check complete: ${res.data.outcome.toUpperCase()} (${res.data.duration_ms}ms, Status: ${res.data.status_code || 'N/A'})`,
        res.data.is_success ? 'success' : 'error'
      );
      loadEndpoints();
    } catch {
      showToast('Manual check execution failed', 'error');
    } finally {
      setCheckingEndpointId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteEndpointId) return;
    try {
      await endpointsApi.delete(deleteEndpointId);
      showToast('Endpoint and check history deleted', 'success');
      setDeleteEndpointId(null);
      loadEndpoints();
    } catch {
      showToast('Failed to delete endpoint', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Endpoints</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage monitored HTTP/HTTPS services, safety configurations, intervals, and SLA thresholds.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setSelectedEndpoint(null);
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Register Endpoint
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card bodyClassName="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by API name or URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Environments</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
              <option value="Internal">Internal</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Healthy">Healthy</option>
              <option value="Degraded">Degraded</option>
              <option value="Down">Down</option>
              <option value="Paused">Paused</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Endpoints Table */}
      {endpoints.length === 0 && !loading ? (
        <EmptyState
          icon={<Server className="w-8 h-8 text-brand-blue" />}
          title="No API endpoints found"
          description="Register your first HTTP/HTTPS service endpoint to start recording health checks and latency trends."
          actionText="Register Endpoint"
          onAction={() => {
            setSelectedEndpoint(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <Card bodyClassName="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Endpoint</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Environment</th>
                <th className="px-4 py-3.5">Check Interval</th>
                <th className="px-4 py-3.5">Latency</th>
                <th className="px-4 py-3.5">Last Checked</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {endpoints.map((ep) => (
                <tr
                  key={ep.id}
                  onClick={() => navigate(`/endpoints/${ep.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                        {ep.method}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 text-sm block">{ep.name}</span>
                        <span className="font-mono text-slate-400 text-[11px] truncate block max-w-sm">
                          {ep.url}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={ep.status as any}>{ep.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {ep.environment}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600 font-mono">Every {ep.check_interval_seconds}s</td>
                  <td className="px-4 py-4 font-mono font-medium text-slate-700">
                    {ep.last_response_time_ms ? `${ep.last_response_time_ms} ms` : '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    {ep.last_checked_at ? new Date(ep.last_checked_at).toLocaleTimeString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={checkingEndpointId === ep.id}
                        onClick={(e) => handleCheckNow(ep.id, e)}
                        title="Run check immediately"
                      >
                        Check Now
                      </Button>

                      <button
                        onClick={(e) => handleTogglePause(ep, e)}
                        title={ep.is_active ? 'Pause monitoring' : 'Resume monitoring'}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        {ep.is_active ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEndpoint(ep);
                          setIsModalOpen(true);
                        }}
                        title="Edit endpoint configuration"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteEndpointId(ep.id);
                        }}
                        title="Delete endpoint"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Endpoint Add / Edit Modal */}
      <EndpointModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEndpoint(null);
        }}
        onSubmit={handleSaveEndpoint}
        initialData={selectedEndpoint}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteEndpointId}
        onClose={() => setDeleteEndpointId(null)}
        onConfirm={handleDelete}
        title="Delete Endpoint"
        message="Are you sure you want to permanently delete this endpoint? All associated monitoring checks, incidents, and historical latency records will be erased."
        confirmText="Delete Endpoint"
        variant="danger"
      />
    </div>
  );
};
