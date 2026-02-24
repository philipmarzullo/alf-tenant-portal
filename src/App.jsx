import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import PageWrapper from './components/layout/PageWrapper';

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
import QBUBuilder from './pages/tools/QBUBuilder';
import SalesDeckBuilder from './pages/tools/SalesDeckBuilder';
import AgentManagement from './pages/admin/AgentManagement';
import SettingsPage from './pages/admin/SettingsPage';

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
            <Route path="/hr" element={<HRLayout />}>
              <Route index element={<HROverview />} />
              <Route path="benefits" element={<Benefits />} />
              <Route path="pay-rates" element={<PayRateChanges />} />
              <Route path="leave" element={<LeaveManagement />} />
              <Route path="unemployment" element={<Unemployment />} />
              <Route path="union-calendar" element={<UnionCalendar />} />
            </Route>
            <Route path="/finance" element={<FinanceOverview />} />
            <Route path="/purchasing" element={<PurchasingOverview />} />
            <Route path="/tools/qbu" element={<QBUBuilder />} />
            <Route path="/tools/sales-deck" element={<SalesDeckBuilder />} />
            <Route path="/admin/agents" element={<AgentManagement />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Routes>
        </PageWrapper>
      </div>
    </div>
  );
}
