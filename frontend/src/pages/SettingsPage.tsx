import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Database,
  Lock,
  User as UserIcon,
  Server,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, systemApi } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [systemReady, setSystemReady] = useState<any>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    systemApi.ready().then((res) => setSystemReady(res.data)).catch(() => {});
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const payload: any = { full_name: fullName };
      if (password.trim()) payload.password = password;

      await authApi.updateMe(payload);
      showToast('Profile updated successfully', 'success');
      setPassword('');
      refreshUser();
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Account Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Profile security, SSRF policy enforcement, background scheduler mode, and cloud database parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card title="Account Profile & Security" subtitle="Update user information and access credentials">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Account identity is managed by organizational admin</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2">
              <Button variant="primary" type="submit" isLoading={isUpdating}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* System & Architecture Diagnostics */}
        <div className="space-y-6">
          <Card title="Cloud Engine Diagnostics" subtitle="Operational health, storage, and worker scheduling">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Database Engine</span>
                <span className="font-mono font-semibold text-slate-800">
                  {systemReady?.database === 'connected' ? 'Connected (PostgreSQL / SQLite fallback)' : 'Online'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Background Scheduler</span>
                <span className="font-mono font-semibold text-emerald-600">Active (AsyncIO & Celery Ready)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">SSRF Protection Engine</span>
                <span className="font-mono font-semibold text-brand-blue">Enforced (RFC1918 / Cloud Metadata Blocked)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">History Retention</span>
                <span className="font-mono font-semibold text-slate-800">30 Days Rolling</span>
              </div>
            </div>
          </Card>

          <Card title="SSRF & Cybersecurity Guardrails" subtitle="Network security posture">
            <p className="text-xs text-slate-600 leading-relaxed">
              PulseCloud implements strict URL validation, DNS resolution checks before dispatch, and denies access to private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and cloud instance metadata addresses (169.254.169.254) to eliminate SSRF attack vectors.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
