import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Bell
} from 'lucide-react';
import { incidentsApi, alertsApi } from '../services/api';
import { Incident, AlertEvent } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  AcknowledgeModal,
  ResolveModal,
  AddNoteModal
} from '../components/modals/IncidentActionModals';
import { useToast } from '../context/ToastContext';

export const IncidentsAlerts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'alerts'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [ackIncident, setAckIncident] = useState<Incident | null>(null);
  const [resolveIncident, setResolveIncident] = useState<Incident | null>(null);
  const [noteIncidentId, setNoteIncidentId] = useState<number | null>(null);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter.toLowerCase();
      if (severityFilter !== 'All') params.severity = severityFilter.toLowerCase();

      const [incRes, alertsRes] = await Promise.all([
        incidentsApi.getAll(params),
        alertsApi.getEvents(),
      ]);
      setIncidents(incRes.data);
      setAlerts(alertsRes.data);
      if (incRes.data.length > 0 && !selectedIncident) {
        setSelectedIncident(incRes.data[0]);
      }
    } catch {
      showToast('Failed to load incident data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (note: string) => {
    if (!ackIncident) return;
    try {
      const res = await incidentsApi.acknowledge(ackIncident.id, note);
      showToast('Incident acknowledged', 'success');
      setAckIncident(null);
      loadData();
      setSelectedIncident(res.data);
    } catch {
      showToast('Failed to acknowledge incident', 'error');
    }
  };

  const handleResolve = async (resolutionNotes: string, rootCause: string) => {
    if (!resolveIncident) return;
    try {
      const res = await incidentsApi.resolve(resolveIncident.id, { resolution_notes: resolutionNotes, root_cause: rootCause });
      showToast('Incident resolved successfully', 'success');
      setResolveIncident(null);
      loadData();
      setSelectedIncident(res.data);
    } catch {
      showToast('Failed to resolve incident', 'error');
    }
  };

  const handleAddNote = async (message: string) => {
    if (!noteIncidentId) return;
    try {
      await incidentsApi.addNote(noteIncidentId, message);
      showToast('Investigation note appended', 'success');
      setNoteIncidentId(null);
      // Reload selected incident
      const updated = await incidentsApi.getById(noteIncidentId);
      setSelectedIncident(updated.data);
      loadData();
    } catch {
      showToast('Failed to add note', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incidents & Alert Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated outage detection, duplicate incident prevention, root cause analysis, and audit trails.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs text-xs font-medium">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'incidents' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Incidents ({incidents.filter((i) => i.status !== 'resolved').length} Open)</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'alerts' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alert Events ({alerts.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'incidents' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Master-Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incident List */}
            <div className="space-y-3 lg:col-span-1">
              {incidents.length === 0 ? (
                <Card className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-xs text-slate-500">No matching incidents found.</p>
                </Card>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedIncident?.id === inc.id
                        ? 'border-brand-blue bg-blue-50/40 ring-1 ring-blue-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={inc.severity === 'critical' ? 'down' : 'degraded'} size="sm">
                        {inc.severity}
                      </Badge>
                      <Badge variant={inc.status === 'resolved' ? 'healthy' : 'neutral'} size="sm">
                        {inc.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm mt-2">{inc.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{inc.description}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Endpoint #{inc.endpoint_id}</span>
                      <span>{new Date(inc.started_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Incident Detail View */}
            <div className="lg:col-span-2">
              {selectedIncident ? (
                <Card
                  title={
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900">Incident #{selectedIncident.id}</span>
                      <Badge variant={selectedIncident.status === 'resolved' ? 'healthy' : 'down'}>
                        {selectedIncident.status}
                      </Badge>
                      <Badge variant={selectedIncident.severity === 'critical' ? 'down' : 'degraded'}>
                        {selectedIncident.severity}
                      </Badge>
                    </div>
                  }
                  action={
                    selectedIncident.status !== 'resolved' && (
                      <div className="flex items-center gap-2">
                        {selectedIncident.status === 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAckIncident(selectedIncident)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setNoteIncidentId(selectedIncident.id)}
                        >
                          Add Note
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setResolveIncident(selectedIncident)}
                        >
                          Resolve
                        </Button>
                      </div>
                    )
                  }
                >
                  <div className="space-y-6">
                    {/* Summary Meta */}
                    <div>
                      <h4 className="font-semibold text-slate-800 text-base">{selectedIncident.title}</h4>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {selectedIncident.description || 'Service failed consecutive automated health checks.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block uppercase font-semibold text-[10px]">Started At</span>
                        <span className="font-mono text-slate-700 mt-0.5 block">
                          {new Date(selectedIncident.started_at).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-semibold text-[10px]">Resolved At</span>
                        <span className="font-mono text-slate-700 mt-0.5 block">
                          {selectedIncident.resolved_at ? new Date(selectedIncident.resolved_at).toLocaleString() : 'In Progress'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-semibold text-[10px]">Root Cause</span>
                        <span className="font-mono text-slate-700 mt-0.5 block truncate">
                          {selectedIncident.root_cause || 'Under Investigation'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-semibold text-[10px]">Affected Checks</span>
                        <span className="font-mono text-slate-700 mt-0.5 block">
                          {selectedIncident.affected_checks_count} consecutive
                        </span>
                      </div>
                    </div>

                    {selectedIncident.resolution_notes && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                          Post-Mortem Resolution Summary
                        </span>
                        <p className="text-sm text-emerald-900 mt-1">{selectedIncident.resolution_notes}</p>
                      </div>
                    )}

                    {/* Timeline Audit Trail */}
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm mb-3">Investigation Timeline & Audit Trail</h4>
                      <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2">
                        {selectedIncident.timeline_events?.map((evt) => (
                          <div key={evt.id} className="relative">
                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-blue ring-4 ring-white" />
                            <div className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{evt.author}</span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  {new Date(evt.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-mono">
                                  {evt.event_type}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-1 leading-relaxed">{evt.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="text-center py-12 text-slate-400 text-xs">
                  Select an incident from the left to inspect its full post-mortem timeline.
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Alerts History Tab */
        <Card title="Triggered Alert Notifications" subtitle="Real-time alert events and notifications stream">
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">No alert events triggered yet.</p>
            ) : (
              alerts.map((al) => (
                <div key={al.id} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${al.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">{al.title}</span>
                      <span className="font-mono text-slate-400">{new Date(al.triggered_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{al.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Action Modals */}
      <AcknowledgeModal
        isOpen={!!ackIncident}
        onClose={() => setAckIncident(null)}
        incident={ackIncident}
        onConfirm={handleAcknowledge}
      />

      <ResolveModal
        isOpen={!!resolveIncident}
        onClose={() => setResolveIncident(null)}
        incident={resolveIncident}
        onConfirm={handleResolve}
      />

      <AddNoteModal
        isOpen={!!noteIncidentId}
        onClose={() => setNoteIncidentId(null)}
        incidentId={noteIncidentId}
        onConfirm={handleAddNote}
      />
    </div>
  );
};
