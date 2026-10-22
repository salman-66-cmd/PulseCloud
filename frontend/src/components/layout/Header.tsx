import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Database } from 'lucide-react';
import { alertsApi, systemApi } from '../../services/api';
import { AlertEvent } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { showToast } = useToast();

  const fetchAlerts = async () => {
    try {
      const res = await alertsApi.getEvents({ is_read: false });
      setAlerts(res.data);
    } catch {
      // Ignore background network blips
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts([]);
      setIsAlertsOpen(false);
      showToast('All notifications marked as read', 'success');
    } catch {
      showToast('Failed to mark alerts as read', 'error');
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    try {
      const res = await systemApi.seedDemo();
      showToast(res.data.message || 'Demo data loaded successfully!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      showToast('Failed to seed demo data', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Status Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Monitoring Engine Active</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
          <span>SSRF Shield: ENFORCED</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Seed Demo Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeedDemoData}
          isLoading={isSeeding}
          leftIcon={<Database className="w-3.5 h-3.5 text-brand-blue" />}
        >
          Load Demo Targets
        </Button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">Alert Notifications</span>
                  {alerts.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-700 rounded-full font-medium">
                      {alerts.length} new
                    </span>
                  )}
                </div>
                {alerts.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-brand-blue hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    No unread notifications. All endpoints normal!
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            alert.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{alert.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{alert.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {new Date(alert.triggered_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
