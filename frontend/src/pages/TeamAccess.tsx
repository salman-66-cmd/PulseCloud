import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Mail,
  CheckCircle2,
  Lock,
  Key
} from 'lucide-react';
import { authApi } from '../services/api';
import { User } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export const TeamAccess: React.FC = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await authApi.getTeam();
      setMembers(res.data);
    } catch {
      showToast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.register({
        email: inviteEmail,
        password: 'TemporaryPass123!',
        full_name: inviteName,
        role: inviteRole,
      });
      showToast(`Invited ${inviteEmail} with temporary password`, 'success');
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      loadTeam();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to invite team member', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team & Access Control</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization members, role-based authorization (RBAC), and team-scoped API visibility.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInviteOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite Member
        </Button>
      </div>

      {/* Team Members Table */}
      <Card
        title="Organization Members"
        subtitle="Active user accounts and platform roles"
        bodyClassName="p-0 overflow-x-auto"
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">User</th>
              <th className="px-4 py-3.5">Email</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((mem) => (
              <tr key={mem.id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4 font-semibold text-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-navy-800 text-cyan-300 font-bold flex items-center justify-center uppercase text-xs">
                      {mem.full_name?.charAt(0) || mem.email.charAt(0)}
                    </div>
                    <span>{mem.full_name || 'Member'}</span>
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-slate-600">{mem.email}</td>
                <td className="px-4 py-4">
                  <Badge variant={mem.role === 'admin' ? 'healthy' : 'neutral'} size="sm">
                    {mem.role}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-emerald-600 font-medium">Active</td>
                <td className="px-6 py-4 text-right font-mono text-slate-500">
                  {new Date(mem.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Role Permissions Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Administrator Role (Admin)" subtitle="Full platform governance and configuration rights">
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Full read/write access to all monitored endpoints and clusters</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Acknowledge, investigate, and resolve production outages</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Configure global alert rules and storm cooldown parameters</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Invite and manage team members and permissions</span>
            </li>
          </ul>
        </Card>

        <Card title="Standard Member (User)" subtitle="Developer monitoring and incident investigation rights">
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Register and manage owned API endpoints</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>View real-time telemetry, latency charts, and live health streams</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Add post-mortem investigation notes to active incident timelines</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Export CSV and JSON performance audit reports</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member" maxWidth="md">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="sarah@pulsecloud.io"
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="user">Standard Member (User)</option>
              <option value="admin">Administrator (Admin)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
