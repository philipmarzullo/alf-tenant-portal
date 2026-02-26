import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import PageWrapper from './components/layout/PageWrapper';
import useMediaQuery from './hooks/useMediaQuery';
import { useUser } from './contexts/UserContext';
import { useAuth } from './contexts/AuthContext';

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
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import {
  PlatformTenantsPage,
  PlatformTenantDetailPage,
  PlatformNewTenantPage,
  PlatformUsagePage,
  PlatformConfigPage,
  PlatformAgentsPage,
  PlatformTemplatesPage,
  PlatformBrandPage,
} from './pages/platform';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-dark-nav flex flex-col items-center justify-center">
      <img src="/logo-white.png" alt="A&A" className="h-10 mb-6" />
      <Loader2 size={24} className="text-aa-blue animate-spin" />
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src="/logo-white.png" alt="A&A" className="h-10" />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-xl font-semibold text-dark-text mb-2">Setup Required</h1>
          <p className="text-sm text-secondary-text mb-4">
            Supabase is not configured. Add your project credentials to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code>:
          </p>
          <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-dark-text overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p className="text-xs text-secondary-text mt-4">
            Then restart the dev server.
          </p>
        </div>
      </div>
    </div>
  );
}

function DeactivatedScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-white.png" alt="A&A" className="h-10" />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-dark-text mb-2">Account Deactivated</h1>
          <p className="text-sm text-secondary-text mb-6">
            Your account has been deactivated. Contact your administrator for access.
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthGate({ children }) {
  const { loading: authLoading, isConfigured, session } = useAuth();
  const { realUser, profileLoading } = useUser();

  if (!isConfigured) return <SetupScreen />;
  if (authLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth/login" replace />;
  if (profileLoading) return <LoadingScreen />;
  if (realUser && !realUser.active) return <DeactivatedScreen />;

  return children;
}

function ProtectedRoute({ moduleKey, adminOnly, platformOnly, children }) {
  const { hasModule, isSuperAdmin, isPlatformOwner } = useUser();
  if (platformOnly && !isPlatformOwner) return <Navigate to="/" replace />;
  if (adminOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (moduleKey && !hasModule(moduleKey)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <Routes>
      {/* Public auth routes — no sidebar */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* All other routes wrapped in AuthGate + app shell */}
      <Route
        path="/*"
        element={
          <AuthGate>
            <div className="flex h-screen overflow-hidden">
              <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                isMobile={isMobile}
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
              />
              <div
                className={`flex-1 flex flex-col transition-all duration-200 ${
                  isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-60'
                }`}
              >
                <TopBar isMobile={isMobile} onMenuToggle={() => setMobileMenuOpen(true)} />
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

                    {/* Platform routes — platform_owner only */}
                    <Route path="/platform/tenants" element={<ProtectedRoute platformOnly><PlatformTenantsPage /></ProtectedRoute>} />
                    <Route path="/platform/tenants/new" element={<ProtectedRoute platformOnly><PlatformNewTenantPage /></ProtectedRoute>} />
                    <Route path="/platform/tenants/:id" element={<ProtectedRoute platformOnly><PlatformTenantDetailPage /></ProtectedRoute>} />
                    <Route path="/platform/usage" element={<ProtectedRoute platformOnly><PlatformUsagePage /></ProtectedRoute>} />
                    <Route path="/platform/agents" element={<ProtectedRoute platformOnly><PlatformAgentsPage /></ProtectedRoute>} />
                    <Route path="/platform/config" element={<ProtectedRoute platformOnly><PlatformConfigPage /></ProtectedRoute>} />
                    <Route path="/platform/templates" element={<ProtectedRoute platformOnly><PlatformTemplatesPage /></ProtectedRoute>} />
                    <Route path="/platform/brand" element={<ProtectedRoute platformOnly><PlatformBrandPage /></ProtectedRoute>} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </PageWrapper>
              </div>
            </div>
          </AuthGate>
        }
      />
    </Routes>
  );
}
