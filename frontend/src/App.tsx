import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ApiEndpoints } from './pages/ApiEndpoints';
import { EndpointDetail } from './pages/EndpointDetail';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { IncidentsAlerts } from './pages/IncidentsAlerts';
import { PerformanceAnalytics } from './pages/PerformanceAnalytics';
import { UptimeReports } from './pages/UptimeReports';
import { MonitoringHistory } from './pages/MonitoringHistory';
import { NotificationSettings } from './pages/NotificationSettings';
import { TeamAccess } from './pages/TeamAccess';
import { SettingsPage } from './pages/SettingsPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected SaaS App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewDashboard />} />
              <Route path="endpoints" element={<ApiEndpoints />} />
              <Route path="endpoints/:id" element={<EndpointDetail />} />
              <Route path="live" element={<LiveMonitoring />} />
              <Route path="incidents" element={<IncidentsAlerts />} />
              <Route path="analytics" element={<PerformanceAnalytics />} />
              <Route path="reports" element={<UptimeReports />} />
              <Route path="history" element={<MonitoringHistory />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="team" element={<TeamAccess />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
