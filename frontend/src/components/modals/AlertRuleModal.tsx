import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Endpoint } from '../../types';

interface AlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  endpoints: Endpoint[];
  isLoading?: boolean;
}

export const AlertRuleModal: React.FC<AlertRuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  endpoints,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [endpointId, setEndpointId] = useState<string>('all');
  const [conditionType, setConditionType] = useState('consecutive_failures');
  const [thresholdValue, setThresholdValue] = useState<number>(2);
  const [severity, setSeverity] = useState('high');
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      endpoint_id: endpointId === 'all' ? null : Number(endpointId),
      condition_type: conditionType,
      threshold_value: Number(thresholdValue),
      severity,
      cooldown_minutes: Number(cooldownMinutes),
      is_enabled: true,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Alert Trigger Rule"
      subtitle="Define threshold conditions, severity, and cooldown timers to prevent alert storms."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Rule Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Critical Downtime Alert"
            className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Endpoint Scope</label>
          <select
            value={endpointId}
            onChange={(e) => setEndpointId(e.target.value)}
            className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Global (All Endpoints)</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name} ({ep.environment})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Condition</label>
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="consecutive_failures">Consecutive Failures</option>
              <option value="latency_threshold">Latency Threshold (ms)</option>
              <option value="status_code_mismatch">HTTP Status Code Mismatch</option>
              <option value="downtime">Endpoint Down</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Threshold Value</label>
            <input
              type="number"
              min="1"
              required
              value={thresholdValue}
              onChange={(e) => setThresholdValue(Number(e.target.value))}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cooldown (Minutes)</label>
            <input
              type="number"
              min="1"
              max="1440"
              required
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(Number(e.target.value))}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Create Alert Rule
          </Button>
        </div>
      </form>
    </Modal>
  );
};
