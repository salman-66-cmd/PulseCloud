import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FileSpreadsheet, FileJson } from 'lucide-react';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; report_type: string; format: string }) => Promise<void>;
  isLoading?: boolean;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('Monthly Infrastructure Health Summary');
  const [reportType, setReportType] = useState('health');
  const [format, setFormat] = useState('csv');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, report_type: reportType, format });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Infrastructure Report"
      subtitle="Export monitored API availability, latency metrics, incident audit trails, or environment comparisons."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="health">Endpoint Health & Status Summary</option>
            <option value="uptime">Availability & Uptime Percentages</option>
            <option value="latency">Response Time & Percentiles (p50, p95, p99)</option>
            <option value="incidents">Incident History & Resolution Log</option>
            <option value="environment_comparison">Environment Multi-Cluster Breakdown</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Export Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                format === 'csv'
                  ? 'border-brand-blue bg-blue-50/50 text-brand-blue ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>CSV Spreadsheet</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                format === 'json'
                  ? 'border-brand-blue bg-blue-50/50 text-brand-blue ring-1 ring-blue-500'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileJson className="w-5 h-5 text-violet-600" />
              <span>JSON Structured</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Generate & Download
          </Button>
        </div>
      </form>
    </Modal>
  );
};
