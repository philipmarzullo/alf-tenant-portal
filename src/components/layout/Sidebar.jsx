import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, ShoppingCart, HardHat,
  FileBarChart, Presentation, Settings, UserCog, Briefcase,
  BookOpen, Zap, BarChart3, ChevronLeft, ChevronRight, ChevronDown, LogOut,
  ListChecks, ArrowRightLeft, Calculator, ShieldAlert, GraduationCap, ShieldCheck,
  Wrench, ClipboardList, FileText, Package, Star, MessageSquare, MessageSquareText, Cable, SlidersHorizontal,
  Shield, Clock, Truck, Map, Warehouse, FileCheck, Building2, Activity,
  Lock, TrendingUp, Layers, Bot,
} from 'lucide-react';
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
  Wrench, ClipboardList, FileText, Package, Star, MessageSquare, MessageSquareText, Cable, SlidersHorizontal,
  Shield, Clock, Truck, Map, Warehouse, FileCheck, Building2, Activity,
  Layers, Bot,
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
  'shield-check': ShieldCheck,
  'trending-up': TrendingUp,
};

// Tools that produce real deliverables (PPTX, etc.)
const PRIMARY_TOOLS = new Set(['qbu', 'salesDeck']);

// Admin items that belong in the Automation sub-menu
const AUTOMATION_PATHS = new Set([
  '/portal/admin/automation',
  '/portal/tools/sop-builder',
  '/portal/admin/automation-preferences',
]);

export default function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { currentUser, isSuperAdmin, isAdmin } = useUser();
  const { signOut } = useAuth();
  const { tenantHasModule } = useTenantConfig();
  const brand = useBranding();
  const { customTools } = useCustomTools();
  const { workspaces, tools, navSections, moduleRegistry, getWorkspacePath, getToolPath } = useTenantPortal();
  const { hasFeature, requiredTierLabel } = useTierAccess();
  const [upgradeModal, setUpgradeModal] = useState(null);

  // Collapsible state — workspaces open if any workspace is active
  const workspaceActive = workspaces.some(ws => location.pathname.startsWith(getWorkspacePath(ws.department_key)));
  const [workspacesOpen, setWorkspacesOpen] = useState(workspaceActive);
  const automationActive = AUTOMATION_PATHS.has(location.pathname) || [...AUTOMATION_PATHS].some(p => location.pathname.startsWith(p));
  const [automationOpen, setAutomationOpen] = useState(automationActive);
  const [quickTemplatesOpen, setQuickTemplatesOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/portal') return location.pathname === '/portal';
    return location.pathname.startsWith(path);
  };

  // Build nav section items from DB nav sections
  const dbNavGroups = useMemo(() => {
    const groups = {};
    for (const section of navSections) {
      groups[section.section_key] = {
        group: section.label.toUpperCase(),
        sectionKey: section.section_key,
        items: (section.items || []).map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon,
          moduleKey: item.module_key || null,
          adminOnly: item.admin_only || false,
          superAdminOnly: item.super_admin_only || false,
        })),
      };
    }
    return groups;
  }, [navSections]);

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

  // Build dynamic TOOLS group from tenant_tools — split into primary + templates
  const dynamicTools = useMemo(() => {
    const allTools = tools.map((t) => ({
      label: t.name,
      path: getToolPath(t.tool_key),
      icon: t.icon || 'Wrench',
      moduleKey: 'tools',
      pageKey: t.tool_key,
      _dynamic: true,
      _primary: PRIMARY_TOOLS.has(t.tool_key),
    }));
    return {
      group: 'TOOLS',
      items: allTools,
    };
  }, [tools, getToolPath]);

  // Assemble full nav: command-center section → workspaces → analytics section → tools → admin section
  const allNavGroups = useMemo(() => {
    const commandCenter = dbNavGroups['command-center'];
    const analytics = dbNavGroups['analytics'];
    const admin = dbNavGroups['admin'];
    return [commandCenter, dynamicWorkspaces, analytics, dynamicTools, admin].filter(Boolean);
  }, [dbNavGroups, dynamicWorkspaces, dynamicTools]);

  // Filter nav items by tenant config + user permissions.
  const filteredNav = allNavGroups
    .map((group) => {
      let items = group.items
        .map((item) => {
          if (!item.moduleKey) return item;
          if (item.superAdminOnly) return isSuperAdmin ? item : null;
          if (item.moduleKey === 'superAdmin') return isSuperAdmin ? item : null;
          if (item.moduleKey === 'admin' || item.adminOnly) return isAdmin ? item : null;

          // Dynamic items from DB are already tenant-gated
          if (item._dynamic) {
            if (isAdmin) return item;
            return currentUser?.modules?.includes(item.moduleKey) ? item : null;
          }

          // Static items: check tenant module config
          if (!tenantHasModule(item.moduleKey)) {
            if (!hasFeature(item.moduleKey)) {
              return { ...item, _tierLocked: true };
            }
            return null;
          }
          // Per-page gating removed — if module is on, all pages are available
          if (isAdmin) return item;
          return currentUser?.modules?.includes(item.moduleKey) ? item : null;
        })
        .filter(Boolean);

      // Inject locked placeholders for empty dynamic groups
      if (group.group === 'WORKSPACES' && items.length === 0) {
        const workspaceModules = moduleRegistry
          .filter(m => m.module_type === 'workspace')
          .filter(m => !hasFeature(m.module_key));
        const lockedWorkspaces = workspaceModules.map(m => ({
          label: m.label,
          path: `/portal/${m.module_key}`,
          icon: m.icon || 'ClipboardList',
          _tierLocked: true,
          _lockedModule: m.module_key,
        }));
        items = lockedWorkspaces;
      }

      if (group.group === 'TOOLS' && items.length === 0 && !hasFeature('tools')) {
        items = [{
          label: 'Tools',
          path: '/portal/tools',
          icon: 'Wrench',
          _tierLocked: true,
          _lockedModule: 'tools',
        }];
      }

      // Inject custom tools into the TOOLS group
      if (group.group === 'TOOLS' && items.length > 0 && !items[0]?._tierLocked && customTools.length > 0) {
        const customItems = customTools.map(t => ({
          label: t.label,
          path: `/portal/tools/custom/${t.tool_key}`,
          icon: t.icon || 'Wrench',
          moduleKey: 'tools',
          _custom: true,
          _primary: true, // custom tools are primary
        }));
        items = [...items, ...customItems];
      }

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  const showCollapsed = !isMobile && collapsed;

  // --- Rendering helpers ---

  function renderNavItem(item, indent = false) {
    const Icon = ICON_MAP[item.icon];

    if (item._tierLocked) {
      return (
        <button
          key={item.path || item._lockedModule}
          onClick={() => setUpgradeModal({
            featureLabel: item.label,
            requiredTierLabel: requiredTierLabel(item._lockedModule || item.moduleKey),
          })}
          className={`flex items-center gap-3 ${indent ? 'pl-8 pr-4' : 'px-4'} py-2 mx-2 rounded-md text-sm text-white/20 cursor-pointer hover:bg-white/5 transition-colors w-full text-left`}
        >
          {Icon && <Icon size={indent ? 15 : 18} />}
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
        className={`flex items-center gap-3 ${indent ? 'pl-8 pr-4' : 'px-4'} py-2 mx-2 rounded-md text-sm transition-colors relative ${
          active
            ? 'bg-white/10 text-white'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        }`}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-aa-blue" />
        )}
        {Icon && <Icon size={indent ? 15 : 18} />}
        {!showCollapsed && <span>{item.label}</span>}
      </NavLink>
    );
  }

  function renderCollapsibleHeader(label, icon, isOpen, onToggleOpen, hasActiveChild) {
    const Icon = ICON_MAP[icon] || Layers;
    return (
      <button
        onClick={onToggleOpen}
        className={`flex items-center gap-3 px-4 py-2 mx-2 rounded-md text-sm transition-colors w-full text-left ${
          hasActiveChild
            ? 'text-white/80'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        }`}
      >
        <Icon size={18} />
        {!showCollapsed && (
          <>
            <span className="flex-1">{label}</span>
            <ChevronDown
              size={14}
              className={`text-white/30 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            />
          </>
        )}
      </button>
    );
  }

  function renderGroup(group) {
    // --- WORKSPACES: collapsible ---
    if (group.group === 'WORKSPACES') {
      const anyActive = group.items.some(item => !item._tierLocked && isActive(item.path));
      return (
        <div key={group.group} className="mb-4">
          {!showCollapsed && (
            <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
              {group.group}
            </div>
          )}
          {renderCollapsibleHeader('Workspaces', 'Briefcase', workspacesOpen, () => setWorkspacesOpen(!workspacesOpen), anyActive)}
          {workspacesOpen && (
            <div className="mt-0.5">
              {group.items.map(item => renderNavItem(item, true))}
            </div>
          )}
        </div>
      );
    }

    // --- TOOLS: split primary vs quick templates ---
    if (group.group === 'TOOLS') {
      const primaryTools = group.items.filter(i => i._primary);
      const templateTools = group.items.filter(i => !i._primary && !i._tierLocked);
      const lockedTools = group.items.filter(i => i._tierLocked);

      return (
        <div key={group.group} className="mb-4">
          {!showCollapsed && (
            <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
              {group.group}
            </div>
          )}
          {/* Primary tools (real output) — always visible */}
          {primaryTools.map(item => renderNavItem(item))}
          {/* Locked tools */}
          {lockedTools.map(item => renderNavItem(item))}
          {/* Quick templates — collapsible */}
          {templateTools.length > 0 && (
            <>
              {renderCollapsibleHeader('Quick Templates', 'FileText', quickTemplatesOpen, () => setQuickTemplatesOpen(!quickTemplatesOpen), templateTools.some(i => isActive(i.path)))}
              {quickTemplatesOpen && (
                <div className="mt-0.5">
                  {templateTools.map(item => renderNavItem(item, true))}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // --- ADMIN: split automation sub-menu ---
    if (group.sectionKey === 'admin' || group.group === 'ADMIN') {
      const automationItems = group.items.filter(i => AUTOMATION_PATHS.has(i.path));
      const otherItems = group.items.filter(i => !AUTOMATION_PATHS.has(i.path));

      return (
        <div key={group.group} className="mb-4">
          {!showCollapsed && (
            <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
              {group.group}
            </div>
          )}
          {/* Non-automation admin items */}
          {otherItems.map(item => renderNavItem(item))}
          {/* Automation sub-menu */}
          {automationItems.length > 0 && (
            <>
              {renderCollapsibleHeader('Automation', 'Zap', automationOpen, () => setAutomationOpen(!automationOpen), automationItems.some(i => !i._tierLocked && isActive(i.path)))}
              {automationOpen && (
                <div className="mt-0.5">
                  {automationItems.map(item => renderNavItem(item, true))}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // --- Default group rendering ---
    return (
      <div key={group.group} className="mb-4">
        {!showCollapsed && (
          <div className="px-4 mb-2 text-[11px] font-semibold tracking-wider text-white/30 uppercase">
            {group.group}
          </div>
        )}
        {group.items.map(item => renderNavItem(item))}
      </div>
    );
  }

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
        {filteredNav.map(group => renderGroup(group))}
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
