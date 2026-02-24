import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import PageWrapper from './components/layout/PageWrapper';
import { useUser } from './contexts/UserContext';

import Dashboard from './pages/Dashboard';
import HRLayout from './pages/hr/HRLayout';
import HROverview from './pages/hr/HROverview';
import Benefits from './pages/hr/Benefits';
import PayRateChanges from './pages/hr/PayRateChanges';
import LeaveManagement from './pages/hr/LeaveManagement';
import Unemployment from './pages/hr/Unemployment';
import UnionCalendar from './pages/hr/UnionCalendar';
import FinanceOverview from './pages/finance/FinanceOverview';
import PurchasingOverview from './pages/purchasing/PurchasingOverview';
import SalesLayout from './pages/sales/SalesLayout';
import OpsOverview from './pages/ops/OpsOverview';
import SalesOverview from './pages/sales/SalesOverview';
import SalesContracts from './pages/sales/SalesContracts';
import APCTracker from './pages/sales/APCTracker';
import TBITracker from './pages/sales/TBITracker';
import QBUBuilder from './pages/tools/QBUBuilder';
import SalesDeckBuilder from './pages/tools/SalesDeckBuilder';
import AgentManagement from './pages/admin/AgentManagement';
import SettingsPage from './pages/admin/SettingsPage';
import UserManagement from './pages/admin/UserManagement';

function ProtectedRoute({ moduleKey, adminOnly, children }) {
  const { hasModule, isAdmin } = useUser();
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (moduleKey && !hasModule(moduleKey)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <TopBar />
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route
              path="/hr"
              element={
                <ProtectedRoute moduleKey="hr">
                  <HRLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HROverview />} />
              <Route path="benefits" element={<Benefits />} />
              <Route path="pay-rates" element={<PayRateChanges />} />
              <Route path="leave" element={<LeaveManagement />} />
              <Route path="unemployment" element={<Unemployment />} />
              <Route path="union-calendar" element={<UnionCalendar />} />
            </Route>

            <Route
              path="/finance"
              element={
                <ProtectedRoute moduleKey="finance">
                  <FinanceOverview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ops"
              element={
                <ProtectedRoute moduleKey="ops">
                  <OpsOverview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchasing"
              element={
                <ProtectedRoute moduleKey="purchasing">
                  <PurchasingOverview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales"
              element={
                <ProtectedRoute moduleKey="sales">
                  <SalesLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SalesOverview />} />
              <Route path="contracts" element={<SalesContracts />} />
              <Route path="apc" element={<APCTracker />} />
              <Route path="tbi" element={<TBITracker />} />
            </Route>

            <Route
              path="/tools/qbu"
              element={
                <ProtectedRoute moduleKey="qbu">
                  <QBUBuilder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tools/sales-deck"
              element={
                <ProtectedRoute moduleKey="salesDeck">
                  <SalesDeckBuilder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/agents"
              element={
                <ProtectedRoute adminOnly>
                  <AgentManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute adminOnly>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageWrapper>
      </div>
    </div>
  );
}
