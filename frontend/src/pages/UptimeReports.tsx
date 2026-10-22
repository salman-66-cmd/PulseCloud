import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { endpointsApi, analyticsApi, reportsApi } from '../services/api';
import { Endpoint, ReportJob } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ReportExportModal } from '../components/modals/ReportExportModal';
import { useToast } from '../context/ToastContext';

interface EndpointUptimeRow {
  endpoint: Endpoint;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  outageMins: number;
}

export const UptimeReports: React.FC = () => {
  const [rows, setRows] = useState<EndpointUptimeRow[]>([]);
  const [reports, setReports] = useState<ReportJob[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [epsRes, repRes] = await Promise.all([
        endpointsApi.getAll(),
        reportsApi.getAll(),
      ]);

      const endpoints = epsRes.data;
      setReports(repRes.data);

      const tableRows: EndpointUptimeRow[] = [];
      for (const ep of endpoints) {
        const [u24, u7d, u30d] = await Promise.all([
          analyticsApi.getUptime({ endpoint_id: ep.id, hours: 24 }),
          analyticsApi.getUptime({ endpoint_id: ep.id, hours: 168 }),
          analyticsApi.getUptime({ endpoint_id: ep.id, hours: 720 }),
        ]);
        tableRows.push({
          endpoint: ep,
          uptime24h: u24.data.uptime_percentage,
          uptime7d: u7d.data.uptime_percentage,
          uptime30d: u30d.data.uptime_percentage,
          outageMins: u24.data.outage_duration_minutes,
        });
      }
      setRows(tableRows);
    } catch {
      showToast('Failed to load uptime reporting data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async (data: { title: string; report_type: string; format: string }) => {
    try {
      const res = await reportsApi.create(data);
      showToast('Report generated successfully! Starting download...', 'success');
      setIsExportOpen(false);

      // Trigger download
      window.open(reportsApi.downloadUrl(res.data.id), '_blank');
      loadData();
    } catch {
      showToast('Report export failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Uptime & Availability Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Empirical observation records, outage duration estimates, and downloadable compliance reports.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsExportOpen(true)}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export Report
        </Button>
      </div>

      {/* Methodology Disclaimer Note */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 leading-relaxed">
        <p className="font-semibold text-blue-950 mb-0.5">Uptime Calculation Methodology</p>
        Uptime percentages are calculated from active monitoring check executions recorded by background workers over the respective windows (24h, 7d, 30d). Monitoring gaps and paused periods are excluded from degradation penalties.
      </div>

      {/* Uptime Table by Endpoint */}
      <Card title="Observed Endpoint Availability" subtitle="Calculated across 24-hour, 7-day, and 30-day windows" bodyClassName="p-0 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Endpoint Name</th>
              <th className="px-4 py-3.5">Environment</th>
              <th className="px-4 py-3.5">24h Uptime</th>
              <th className="px-4 py-3.5">7d Uptime</th>
              <th className="px-4 py-3.5">30d Uptime</th>
              <th className="px-4 py-3.5">Outage Duration (24h)</th>
              <th className="px-6 py-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.endpoint.id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">
                      {r.endpoint.method}
                    </span>
                    <span className="font-semibold text-slate-800">{r.endpoint.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600 font-mono">{r.endpoint.environment}</td>
                <td className="px-4 py-4 font-mono font-semibold">
                  <span className={r.uptime24h >= 99 ? 'text-emerald-600' : 'text-amber-600'}>
                    {r.uptime24h.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-4 font-mono text-slate-700">{r.uptime7d.toFixed(2)}%</td>
                <td className="px-4 py-4 font-mono text-slate-700">{r.uptime30d.toFixed(2)}%</td>
                <td className="px-4 py-4 text-slate-600 font-mono">
                  {r.outageMins > 0 ? `${r.outageMins} mins` : '0 mins'}
                </td>
                <td className="px-6 py-4 text-right">
                  <Badge variant={r.endpoint.status as any} size="sm">
                    {r.endpoint.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Generated Reports History */}
      <Card title="Generated Report Exports" subtitle="Download previously generated CSV spreadsheets and JSON summaries">
        {reports.length === 0 ? (
          <p className="text-center py-6 text-slate-400 text-xs">No export jobs generated yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-brand-blue" />
                  <div>
                    <span className="font-semibold text-slate-800 text-sm block">{rep.title}</span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      Type: {rep.report_type.toUpperCase()} • {rep.row_count} records • {new Date(rep.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <a
                  href={reportsApi.downloadUrl(rep.id)}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {rep.format.toUpperCase()}</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Export Modal */}
      <ReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onSubmit={handleExport}
      />
    </div>
  );
};
