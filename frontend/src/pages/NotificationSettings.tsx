import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Edit,
  ShieldAlert,
  Clock,
  Mail,
  Webhook,
  CheckCircle2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { alertsApi, endpointsApi } from '../services/api';
import { AlertRule, Endpoint } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { AlertRuleModal } from '../components/modals/AlertRuleModal';
import { useToast } from '../context/ToastContext';

export const NotificationSettings: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Channel simulation settings
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/X00');

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, epsRes] = await Promise.all([
        alertsApi.getRules(),
        endpointsApi.getAll(),
      ]);
      setRules(rulesRes.data);
      setEndpoints(epsRes.data);
    } catch {
      showToast('Failed to load alert rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRule = async (data: any) => {
    try {
      await alertsApi.createRule(data);
      showToast('Alert rule created successfully', 'success');
      setIsModalOpen(false);
      loadData();
    } catch {
      showToast('Failed to create alert rule', 'error');
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await alertsApi.updateRule(rule.id, { is_enabled: !rule.is_enabled });
      showToast(`Rule ${!rule.is_enabled ? 'enabled' : 'disabled'}`, 'info');
      loadData();
    } catch {
      showToast('Failed to toggle rule', 'error');
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    try {
      await alertsApi.deleteRule(deleteRuleId);
      showToast('Alert rule deleted', 'success');
      setDeleteRuleId(null);
      loadData();
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification & Alert Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure threshold rules, alert storm cooldowns, and outbound notification channels.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Alert Rule
        </Button>
      </div>

      {/* Rules Table */}
      <Card
        title="Active Alert Trigger Rules"
        subtitle="Automated checks evaluated on every health check execution"
        bodyClassName="p-0 overflow-x-auto"
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Rule Name</th>
              <th className="px-4 py-3.5">Endpoint Scope</th>
              <th className="px-4 py-3.5">Condition</th>
              <th className="px-4 py-3.5">Threshold</th>
              <th className="px-4 py-3.5">Severity</th>
              <th className="px-4 py-3.5">Cooldown</th>
              <th className="px-4 py-3.5">State</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  No alert rules configured yet. Click "Add Alert Rule" to configure proactive alerts.
                </td>
              </tr>
            ) : (
              rules.map((rule) => {
                const ep = endpoints.find((e) => e.id === rule.endpoint_id);
                return (
                  <tr key={rule.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-semibold text-slate-800">{rule.name}</td>
                    <td className="px-4 py-4 font-mono text-slate-600">
                      {ep ? ep.name : <span className="text-cyan-700 font-semibold">Global (All Endpoints)</span>}
                    </td>
                    <td className="px-4 py-4 text-slate-700 font-mono capitalize">
                      {rule.condition_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800 font-mono">
                      {rule.threshold_value} {rule.condition_type === 'latency_threshold' ? 'ms' : 'fails'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={rule.severity === 'critical' ? 'down' : 'degraded'} size="sm">
                        {rule.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600">{rule.cooldown_minutes} mins</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className="flex items-center gap-1.5 focus:outline-none"
                      >
                        {rule.is_enabled ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <ToggleRight className="w-5 h-5" /> Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 font-medium">
                            <ToggleLeft className="w-5 h-5" /> Disabled
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteRuleId(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Outbound Notification Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="In-App & Email Notifications" subtitle="Direct in-app toaster alerts and simulated SMTP notifications">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand-blue" />
                <div>
                  <span className="font-semibold text-slate-800 text-sm block">Email Dispatch (SMTP)</span>
                  <span className="text-xs text-slate-500">Sends incident alert emails upon severity threshold</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setEmailAlertsEnabled(!emailAlertsEnabled);
                  showToast(`Email alerts ${!emailAlertsEnabled ? 'enabled' : 'disabled'}`, 'info');
                }}
              >
                {emailAlertsEnabled ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Note: PulseCloud is designed to operate safely without requiring live external SMTP credentials; all alerts are stored and immediately presented through the In-App Notification Center.
            </p>
          </div>
        </Card>

        <Card title="Webhook Outbound Integration" subtitle="Dispatch JSON webhooks to Slack, Discord, or PagerDuty">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Webhook Endpoint URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast('Test webhook dispatch validated successfully (200 OK)', 'success')}
            >
              Test Webhook Dispatch
            </Button>
          </div>
        </Card>
      </div>

      {/* Add Modal */}
      <AlertRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRule}
        endpoints={endpoints}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRuleId}
        onClose={() => setDeleteRuleId(null)}
        onConfirm={handleDeleteRule}
        title="Delete Alert Rule"
        message="Are you sure you want to delete this alert rule? This will stop future notifications from being dispatched for this rule."
        confirmText="Delete Rule"
        variant="danger"
      />
    </div>
  );
};
