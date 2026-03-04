import { useState, Component } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Error boundary to catch render crashes and show the error instead of a white screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      const errMsg = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err);
      const errStack = typeof err === 'object' ? err.stack : '';
      return (
        <div className="p-8 max-w-xl mx-auto mt-12">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
          <pre className="text-sm text-red-600 bg-red-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap max-h-60">
            {errMsg}
          </pre>
          {errStack && (
            <details className="mt-2">
              <summary className="text-xs text-secondary-text cursor-pointer">Stack trace</summary>
              <pre className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg overflow-auto whitespace-pre-wrap max-h-40 mt-1">
                {errStack}
              </pre>
            </details>
          )}
          {this.state.errorInfo?.componentStack && (
            <details className="mt-2" open>
              <summary className="text-xs font-medium text-red-600 cursor-pointer">Component stack</summary>
              <pre className="text-xs text-red-500 bg-red-50 p-3 rounded-lg overflow-auto whitespace-pre-wrap max-h-60 mt-1">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button onClick={() => this.setState({ error: null, errorInfo: null })} className="mt-4 px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import PageWrapper from './components/layout/PageWrapper';
import useMediaQuery from './hooks/useMediaQuery';
import { useUser } from './contexts/UserContext';
import { useAuth } from './contexts/AuthContext';
import { useBranding } from './contexts/BrandingContext';
import { useTenantPortal } from './contexts/TenantPortalContext';
import AlfMark from './components/shared/AlfMark';
import OnboardingPage from './pages/onboarding/OnboardingPage';
import PortalSetupPlaceholder from './pages/onboarding/PortalSetupPlaceholder';
import useTierAccess from './hooks/useTierAccess';
import UpgradePrompt from './components/shared/UpgradePrompt';

import Dashboard from './pages/Dashboard';
import MyWorkPage from './pages/MyWorkPage';
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
import ToolPage from './pages/tools/ToolPage';
import SOPBuilder from './pages/tools/SOPBuilder';
import SOPEditorPage from './pages/tools/SOPEditorPage';
import CustomToolBuilder from './pages/tools/CustomToolBuilder';
import CustomToolPage from './pages/tools/CustomToolPage';
import RFPProjectsPage from './pages/tools/RFPProjectsPage';
import RFPLibraryPage from './pages/tools/RFPLibraryPage';
import RFPProjectDetail from './pages/tools/RFPProjectDetail';
import AgentKnowledgePage from './pages/admin/AgentKnowledgePage';
import SettingsPage from './pages/admin/SettingsPage';
import RoleTemplates from './pages/admin/RoleTemplates';
import UserManagement from './pages/admin/UserManagement';
import AutomationPage from './pages/admin/AutomationPage';
import AgentFactoryPage from './pages/admin/AgentFactoryPage';
import ConnectionsPage from './pages/admin/ConnectionsPage';
import DashboardsLayout from './pages/dashboards/DashboardsLayout';
import OperationsDashboard from './pages/dashboards/OperationsDashboard';
import LaborDashboard from './pages/dashboards/LaborDashboard';
import QualityDashboard from './pages/dashboards/QualityDashboard';
import TimekeepingDashboard from './pages/dashboards/TimekeepingDashboard';
import SafetyDashboard from './pages/dashboards/SafetyDashboard';
import ActionPlansPage from './pages/dashboards/ActionPlansPage';
import DynamicDashboard from './pages/dashboards/DynamicDashboard';
import AnalyticsChatPage from './pages/analytics/AnalyticsChatPage';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

import MarketingLayout from './pages/marketing/MarketingLayout';
import HomePage from './pages/marketing/HomePage';
import PricingPage from './pages/marketing/PricingPage';
import RequestDemoPage from './pages/marketing/RequestDemoPage';
import MelmacInvaders from './pages/marketing/MelmacInvaders';

/**
 * Catch-all route for dynamic dashboard domains.
 * Renders DynamicDashboard for any domain_key beyond the 5 legacy defaults.
 */
function DynamicDomainRoute() {
  const { domain } = useParams();
  return <DynamicDashboard domain={domain} />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-dark-nav flex flex-col items-center justify-center">
      <Loader2 size={24} className="text-gray-400 animate-spin" />
    </div>
  );
}

function SetupScreen() {
  const brand = useBranding();
  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.companyName || 'Company'} className="h-10" />
          ) : (
            <div className="text-white text-xl font-light tracking-wide">{brand.companyName || 'Operations Intelligence'}</div>
          )}
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
  const brand = useBranding();
  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.companyName || 'Company'} className="h-10" />
          ) : (
            <div className="text-white text-xl font-light tracking-wide">{brand.companyName || 'Operations Intelligence'}</div>
          )}
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

function NoTenantScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <AlfMark variant="dark" size="lg" showTagline />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-dark-text mb-2">No Organization Found</h1>
          <p className="text-sm text-secondary-text mb-6">
            Your account is not associated with any organization. Contact your administrator.
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
  const { realUser, realIsSuperAdmin, profileLoading } = useUser();
  const { companyProfile, loading: portalLoading } = useTenantPortal();
  const { brandLoading } = useBranding();
  const location = useLocation();

  if (!isConfigured) return <SetupScreen />;
  if (authLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileLoading) return <LoadingScreen />;
  if (realUser && !realUser.tenant_id) return <NoTenantScreen />;
  if (realUser && !realUser.active) return <DeactivatedScreen />;
  if (portalLoading || brandLoading) return <LoadingScreen />;

  // Onboarding redirect: only on unified portal (no VITE_TENANT_ID)
  if (!isStandalone) {
    const profileIsDraft = !companyProfile || companyProfile.profile_status === 'draft';
    if (profileIsDraft) {
      if (realIsSuperAdmin && !location.pathname.startsWith('/onboarding')) {
        return <Navigate to="/onboarding" replace />;
      }
      if (!realIsSuperAdmin) {
        return <PortalSetupPlaceholder />;
      }
    }
  }

  return children;
}

/**
 * Redirects portal index based on role:
 * user/manager → /portal/my-work, admin+ → Dashboard (Command Center)
 */
function PortalIndex() {
  const { isAdmin } = useUser();
  if (!isAdmin) return <Navigate to="/portal/my-work" replace />;
  return <Dashboard />;
}

function ProtectedRoute({ moduleKey, adminOnly, superAdminOnly, children }) {
  const { hasModule, isAdmin, isSuperAdmin } = useUser();
  const { hasFeature, requiredTierLabel } = useTierAccess();

  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/portal" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/portal" replace />;

  // Tier gating — show upgrade prompt instead of redirecting
  if (moduleKey && !hasFeature(moduleKey)) {
    return <UpgradePrompt featureLabel={moduleKey} requiredTierLabel={requiredTierLabel(moduleKey)} />;
  }

  if (moduleKey && !hasModule(moduleKey)) return <Navigate to="/portal" replace />;
  return children;
}

const isStandalone = !!import.meta.env.VITE_TENANT_ID;

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <Routes>
      {/* Public marketing — only on unified portal (no VITE_TENANT_ID) */}
      {!isStandalone ? (
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/request-demo" element={<RequestDemoPage />} />
        </Route>
      ) : (
        <Route path="/" element={<Navigate to="/portal" replace />} />
      )}

      {/* Easter egg game — marketing site only, standalone (no layout chrome) */}
      {!isStandalone && <Route path="/melmac" element={<MelmacInvaders />} />}

      {/* Auth — no sidebar, public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Onboarding — standalone layout, no sidebar */}
      <Route path="/onboarding/*" element={<AuthGate><OnboardingPage /></AuthGate>} />

      {/* Portal — authenticated, full app shell */}
      <Route
        path="/portal/*"
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
                    <Route index element={<PortalIndex />} />
                    <Route path="my-work" element={<MyWorkPage />} />

                    <Route
                      path="hr"
                      element={
                        <ProtectedRoute moduleKey="hr">
                          <HRLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<HROverview />} />
                      <Route path="benefits" element={<ProtectedRoute moduleKey="hr"><Benefits /></ProtectedRoute>} />
                      <Route path="pay-rates" element={<ProtectedRoute moduleKey="hr"><PayRateChanges /></ProtectedRoute>} />
                      <Route path="leave" element={<ProtectedRoute moduleKey="hr"><LeaveManagement /></ProtectedRoute>} />
                      <Route path="unemployment" element={<ProtectedRoute moduleKey="hr"><Unemployment /></ProtectedRoute>} />
                      <Route path="union-calendar" element={<ProtectedRoute moduleKey="hr"><UnionCalendar /></ProtectedRoute>} />
                    </Route>

                    <Route
                      path="finance"
                      element={
                        <ProtectedRoute moduleKey="finance">
                          <FinanceOverview />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="ops"
                      element={
                        <ProtectedRoute moduleKey="ops">
                          <OpsOverview />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="purchasing"
                      element={
                        <ProtectedRoute moduleKey="purchasing">
                          <PurchasingOverview />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="sales"
                      element={
                        <ProtectedRoute moduleKey="sales">
                          <SalesLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<SalesOverview />} />
                      <Route path="contracts" element={<ProtectedRoute moduleKey="sales"><SalesContracts /></ProtectedRoute>} />
                      <Route path="apc" element={<ProtectedRoute moduleKey="sales"><APCTracker /></ProtectedRoute>} />
                      <Route path="tbi" element={<ProtectedRoute moduleKey="sales"><TBITracker /></ProtectedRoute>} />
                    </Route>

                    <Route
                      path="dashboards"
                      element={
                        <ProtectedRoute moduleKey="dashboards">
                          <ErrorBoundary>
                            <DashboardsLayout />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<OperationsDashboard />} />
                      <Route path="labor" element={<LaborDashboard />} />
                      <Route path="quality" element={<QualityDashboard />} />
                      <Route path="timekeeping" element={<TimekeepingDashboard />} />
                      <Route path="safety" element={<SafetyDashboard />} />
                      <Route path="action-plans" element={<ProtectedRoute moduleKey="actionPlans"><ActionPlansPage /></ProtectedRoute>} />
                      {/* Dynamic domain catch-all for tenant-configured domains beyond the 5 defaults */}
                      <Route path=":domain" element={<DynamicDomainRoute />} />
                    </Route>

                    <Route
                      path="analytics"
                      element={
                        <ProtectedRoute moduleKey="analytics">
                          <AnalyticsChatPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Tools — gated by "tools" module */}
                    <Route
                      path="tools/qbu"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <QBUBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/sales-deck"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <SalesDeckBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/transition-plan"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <ToolPage toolKey="transitionPlan" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/budget"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <ToolPage toolKey="budget" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/incident-report"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <ToolPage toolKey="incidentReport" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/training-plan"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <ToolPage toolKey="trainingPlan" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/rfp-response"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <RFPProjectsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/rfp-response/library"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <RFPLibraryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/rfp-response/:projectId"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <RFPProjectDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/sop-builder"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <SOPBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/sop-builder/new"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <SOPEditorPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/sop-builder/edit/:id"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <SOPEditorPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/custom/builder"
                      element={
                        <ProtectedRoute adminOnly>
                          <CustomToolBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="tools/custom/:toolKey"
                      element={
                        <ProtectedRoute moduleKey="tools">
                          <CustomToolPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/users"
                      element={
                        <ProtectedRoute adminOnly>
                          <UserManagement />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/knowledge"
                      element={
                        <ProtectedRoute moduleKey="knowledge" adminOnly>
                          <AgentKnowledgePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/agent-instructions"
                      element={<Navigate to="/portal/admin/knowledge?tab=instructions" replace />}
                    />

                    <Route
                      path="admin/role-templates"
                      element={
                        <ProtectedRoute adminOnly>
                          <RoleTemplates />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/automation"
                      element={
                        <ProtectedRoute moduleKey="automation">
                          <AutomationPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/agents"
                      element={
                        <ProtectedRoute adminOnly>
                          <AgentFactoryPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/connections"
                      element={
                        <ProtectedRoute superAdminOnly>
                          <ConnectionsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="admin/settings"
                      element={
                        <ProtectedRoute superAdminOnly>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/portal" replace />} />
                  </Routes>
                </PageWrapper>
              </div>
            </div>
          </AuthGate>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isStandalone ? "/portal" : "/"} replace />} />
    </Routes>
  );
}
