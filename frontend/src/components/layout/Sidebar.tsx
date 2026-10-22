import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Activity,
  AlertCircle,
  BarChart3,
  FileText,
  History,
  Bell,
  Users,
  Settings,
  LogOut,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'API Endpoints', path: '/endpoints', icon: Server },
    { label: 'Live Monitoring', path: '/live', icon: Radio },
    { label: 'Incidents & Alerts', path: '/incidents', icon: AlertCircle },
    { label: 'Performance Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Uptime Reports', path: '/reports', icon: FileText },
    { label: 'Monitoring History', path: '/history', icon: History },
    { label: 'Notification Settings', path: '/notifications', icon: Bell },
    { label: 'Team & Access', path: '/team', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 flex flex-col flex-shrink-0 min-h-screen text-slate-300 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-navy-800/80 bg-navy-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-blue via-brand-cyan to-brand-violet flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-base">PulseCloud</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[10px] text-cyan-400 tracking-wider font-mono uppercase font-semibold">
              API Monitor
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Cloud Monitoring
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-blue to-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-cyan-200' : 'text-slate-400 group-hover:text-cyan-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-brand-blue flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Cloud User'}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-navy-800 text-cyan-300 rounded border border-navy-700 uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
