import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, ShoppingCart, HardHat,
  FileBarChart, Presentation, Settings, UserCog, Briefcase,
  BookOpen, Zap, BarChart3, ChevronLeft, ChevronRight, LogOut,
  ListChecks, ArrowRightLeft, Calculator, ShieldAlert, GraduationCap, ShieldCheck,
  Wrench, ClipboardList, FileText, Package, Star, MessageSquare, Cable, SlidersHorizontal,
  Shield, Clock, Truck, Map, Warehouse, FileCheck, Building2, Activity,
  Lock,
} from 'lucide-react';
import { STATIC_NAV_GROUPS } from '../../data/constants';
import { MODULE_REGISTRY } from '../../data/moduleRegistry';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import { useBranding } from '../../contexts/BrandingContext';
import { useCustomTools } from '../../contexts/CustomToolsContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import useTierAccess from '../../hooks/useTierAccess';
import UpgradeModal from '../shared/UpgradeModal';

/**
 * Maps icon identifiers (PascalCase or kebab-case from DB) to lucide-react components.
 */
const ICON_MAP = {
  // PascalCase (used in hardcoded constants)
  LayoutDashboard, Users, DollarSign, ShoppingCart, HardHat,
  FileBarChart, Presentation, Settings, UserCog, Briefcase,
  BookOpen, Zap, BarChart3,
  ListChecks, ArrowRightLeft, Calculator, ShieldAlert, GraduationCap, ShieldCheck,
  Wrench, ClipboardList, FileText, Package, Star, MessageSquare, Cable, SlidersHorizontal,
  Shield, Clock, Truck, Map, Warehouse, FileCheck, Building2, Activity,
  // kebab-case (used in tenant_workspaces and tenant_tools from DB)
  'clipboard-list': ClipboardList,
  'users': Users,
  'dollar-sign': DollarSign,
  'shopping-cart': ShoppingCart,
  'hard-hat': HardHat,
  'briefcase': Briefcase,
  'shield': Shield,
  'shield-alert': ShieldAlert,
  'clock': Clock,
  'truck': Truck,
  'map': Map,
  'warehouse': Warehouse,
  'file-check': FileCheck,
  'file-text': FileText,
  'file-bar-chart': FileBarChart,
  'bar-chart': BarChart3,
  'bar-chart-3': BarChart3,
  'presentation': Presentation,
  'wrench': Wrench,
  'calculator': Calculator,
  'graduation-cap': GraduationCap,
  'arrow-right-left': ArrowRightLeft,
  'building': Building2,
  'building-2': Building2,
  'activity': Activity,
  'zap': Zap,
  'settings': Settings,
};

export default function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { currentUser, isSuperAdmin, isAdmin } = useUser();
  const { signOut } = useAuth();
  const { tenantHasModule, hasPage } = useTenantConfig();
  const brand = useBranding();
  const { customTools } = useCustomTools();
  const { workspaces, tools, getWorkspacePath, getToolPath } = useTenantPortal();
  const { hasFeature, requiredTierLabel } = useTierAccess();
  const [upgradeModal, setUpgradeModal] = useState(null);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Build dynamic WORKSPACES group from tenant_workspaces
  const dynamicWorkspaces = useMemo(() => ({
    group: 'WORKSPACES',
    items: workspaces.map((ws) => ({
      label: ws.name,
      path: getWorkspacePath(ws.department_key),
      icon: ws.icon || 'ClipboardList',
      moduleKey: ws.department_key,
      _dynamic: true,
    })),
  }), [workspaces, getWorkspacePath]);

  // Build dynamic TOOLS group from tenant_tools
  const dynamicTools = useMemo(() => ({
    group: 'TOOLS',
    items: tools.map((t) => ({
      label: t.name,
      path: getToolPath(t.tool_key),
      icon: t.icon || 'Wrench',
      moduleKey: 'tools',
      pageKey: t.tool_key,
      _dynamic: true,
    })),
  }), [tools, getToolPath]);

  // Assemble full nav: COMMAND CENTER, dynamic WORKSPACES, ANALYTICS, dynamic TOOLS, ADMIN
  const allNavGroups = useMemo(() => {
    const commandCenter = STATIC_NAV_GROUPS.find((g) => g.group === 'COMMAND CENTER');
    const analytics = STATIC_NAV_GROUPS.find((g) => g.group === 'ANALYTICS');
    const admin = STATIC_NAV_GROUPS.find((g) => g.group === 'ADMIN');
    return [commandCenter, dynamicWorkspaces, analytics, dynamicTools, admin].filter(Boolean);
  }, [dynamicWorkspaces, dynamicTools]);

  // Filter nav items by tenant config + user permissions.
  // Tier-locked items are kept visible (grayed + lock icon) instead of hidden.
  const filteredNav = allNavGroups
    .map((group) => {
      let items = group.items
        .map((item) => {
          if (!item.moduleKey) return item;
          if (item.moduleKey === 'superAdmin') return isSuperAdmin ? item : null;
          if (item.moduleKey === 'admin') return isAdmin ? item : null;
          if (item.adminOnly && !isAdmin) return null;

          // Dynamic items from DB are already tenant-gated
          if (item._dynamic) {
            if (isAdmin) return item;
            return currentUser?.modules?.includes(item.moduleKey) ? item : null;
          }

          // Static items: check tenant module config
          if (!tenantHasModule(item.moduleKey)) {
            // Module not enabled — is it locked by tier? Show it locked.
            if (!hasFeature(item.moduleKey)) {
              return { ...item, _tierLocked: true };
            }
            return null; // Not tier-locked, just admin-disabled — hide
          }
          if (item.pageKey && !hasPage(item.moduleKey, item.pageKey)) return null;
          if (isAdmin) return item;
          return currentUser?.modules?.includes(item.moduleKey) ? item : null;
        })
        .filter(Boolean);

      // Inject locked placeholders for empty dynamic groups
      if (group.group === 'WORKSPACES' && items.length === 0) {
        const workspaceModules = ['hr', 'finance', 'purchasing', 'sales', 'ops'];
        const lockedWorkspaces = workspaceModules
          .filter(m => !hasFeature(m))
          .map(m => ({
            label: MODULE_REGISTRY[m]?.label || m,
            path: `/${m}`,
            icon: MODULE_REGISTRY[m]?.icon || 'ClipboardList',
            _tierLocked: true,
            _lockedModule: m,
          }));
        items = lockedWorkspaces;
      }

      if (group.group === 'TOOLS' && items.length === 0 && !hasFeature('tools')) {
        items = [{
          label: 'Tools',
          path: '/tools',
          icon: 'Wrench',
          _tierLocked: true,
          _lockedModule: 'tools',
        }];
      }

      // Inject custom tools into the TOOLS group
      if (group.group === 'TOOLS' && items.length > 0 && !items[0]?._tierLocked && customTools.length > 0) {
        const customItems = customTools.map(t => ({
          label: t.label,
          path: `/tools/custom/${t.tool_key}`,
          icon: t.icon || 'Wrench',
          moduleKey: 'tools',
          _custom: true,
        }));
        items = [...items, ...customItems];
      }

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  // On mobile: always show full-width sidebar (not collapsed)
  const showCollapsed = !isMobile && collapsed;

  const sidebar = (
    <aside
      className={`fixed top-0 left-0 h-screen bg-dark-nav flex flex-col transition-all duration-200 z-50 ${
        isMobile
          ? `w-60 transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : showCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo + tagline */}
      <div className="flex items-center px-4 h-16 border-b border-white/10 shrink-0">
        {brand.logoUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={brand.logoUrl}
              alt={brand.companyName || 'Company'}
              className={`transition-all duration-200 ${showCollapsed ? 'h-6' : 'h-[30px]'}`}
            />
            {!showCollapsed && (
              <span className="text-[9px] font-light tracking-[3px] text-white/30 uppercase">Operations Intelligence</span>
            )}
          </div>
        ) : (
          !showCollapsed && (
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-medium truncate">
                {brand.companyName || 'Operations Intelligence'}
              </span>
              {brand.companyName && (
                <span className="text-[9px] font-light tracking-[3px] text-white/30 uppercase">Operations Intelligence</span>
              )}
            </div>
          )
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredNav.map((group) => (
          <div key={group.group} className="mb-4">
            {!showCollapsed && (
              <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = ICON_MAP[item.icon];

              if (item._tierLocked) {
                return (
                  <button
                    key={item.path || item._lockedModule}
                    onClick={() => setUpgradeModal({
                      featureLabel: item.label,
                      requiredTierLabel: requiredTierLabel(item._lockedModule || item.moduleKey),
                    })}
                    className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm text-white/20 cursor-pointer hover:bg-white/5 transition-colors w-full text-left"
                  >
                    {Icon && <Icon size={18} />}
                    {!showCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        <Lock size={12} className="text-white/15" />
                      </>
                    )}
                  </button>
                );
              }

              const active = isActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && onMobileClose?.()}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm transition-colors relative ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-aa-blue" />
                  )}
                  {Icon && <Icon size={18} />}
                  {!showCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 shrink-0">
        <div className="w-full px-4 py-3 flex items-center gap-3">
          {showCollapsed ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-aa-blue/20 text-aa-blue">
              {initials}
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-aa-blue/20 text-aa-blue">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{currentUser?.name}</div>
                <div className="text-white/40 text-xs truncate">{currentUser?.title}</div>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle — hidden on mobile */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="border-t border-white/10 px-4 py-3 text-white/30 hover:text-white/60 transition-colors flex items-center justify-center"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </aside>
  );

  return (
    <>
      {/* Backdrop — mobile only */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onMobileClose}
        />
      )}
      {sidebar}
      <UpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        featureLabel={upgradeModal?.featureLabel}
        requiredTierLabel={upgradeModal?.requiredTierLabel}
      />
    </>
  );
}
