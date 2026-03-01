export const BRAND = {
  blue: '#009ADE',
  red: '#E12F2C',
  darkText: '#272727',
  secondaryText: '#5A5D62',
  lightBg: '#F5F5F5',
  white: '#FFFFFF',
  darkNav: '#1B2133',
};

export const DEPT_COLORS = {
  hr: '#009ADE',
  finance: '#0D9488',
  purchasing: '#7C3AED',
  ops: '#4B5563',
  sales: '#F59E0B',
  admin: '#E12F2C',
  tools: '#0284C7',
  // Analytics domain colors (used by home dashboard attention items)
  operations: '#4B5563',
  labor: '#009ADE',
  quality: '#7C3AED',
  timekeeping: '#0D9488',
  safety: '#DC2626',
};

export const STATUS = {
  complete: { label: 'Complete', color: '#16A34A', bg: '#DCFCE7', text: '#166534' },
  inProgress: { label: 'In Progress', color: '#009ADE', bg: '#DBEAFE', text: '#1E40AF' },
  pending: { label: 'Pending', color: '#EAB308', bg: '#FEF9C3', text: '#854D0E' },
  overdue: { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2', text: '#991B1B' },
  inactive: { label: 'Inactive', color: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563' },
  setup: { label: 'Setup', color: '#EAB308', bg: '#FEF9C3', text: '#854D0E' },
  active: { label: 'Active', color: '#16A34A', bg: '#DCFCE7', text: '#166534' },
  approved: { label: 'Approved', color: '#16A34A', bg: '#DCFCE7', text: '#166534' },
  denied: { label: 'Denied', color: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563' },
  processing: { label: 'Processing', color: '#009ADE', bg: '#DBEAFE', text: '#1E40AF' },
  pendingVP: { label: 'Pending VP', color: '#EAB308', bg: '#FEF9C3', text: '#854D0E' },
  declined: { label: 'Declined', color: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563' },
  enrolled: { label: 'Enrolled', color: '#16A34A', bg: '#DCFCE7', text: '#166534' },
  upcoming: { label: 'Upcoming', color: '#EAB308', bg: '#FEF9C3', text: '#854D0E' },
  processed: { label: 'Processed', color: '#16A34A', bg: '#DCFCE7', text: '#166534' },
  expiringSoon: { label: 'Expiring Soon', color: '#EAB308', bg: '#FEF9C3', text: '#854D0E' },
  inRenewal: { label: 'In Renewal', color: '#009ADE', bg: '#DBEAFE', text: '#1E40AF' },
  expired: { label: 'Expired', color: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563' },
};

/**
 * Static navigation groups — not driven by tenant data.
 * WORKSPACES and TOOLS groups are built dynamically by the Sidebar
 * from tenant_workspaces and tenant_tools via TenantPortalContext.
 */
export const STATIC_NAV_GROUPS = [
  {
    group: 'COMMAND CENTER',
    items: [
      { label: 'Command Center', path: '/', icon: 'LayoutDashboard', moduleKey: null },
    ],
  },
  {
    group: 'ANALYTICS',
    items: [
      { label: 'Dashboards', path: '/dashboards', icon: 'BarChart3', moduleKey: 'dashboards' },
      { label: 'Action Plans', path: '/dashboards/action-plans', icon: 'ListChecks', moduleKey: 'actionPlans' },
    ],
  },
  {
    group: 'ADMIN',
    items: [
      { label: 'User Management', path: '/admin/users', icon: 'UserCog', moduleKey: 'admin' },
      { label: 'Knowledge Base', path: '/admin/knowledge', icon: 'BookOpen', moduleKey: 'knowledge' },
      { label: 'Automation Insights', path: '/admin/automation', icon: 'Zap', moduleKey: 'automation' },
      { label: 'Role Templates', path: '/admin/role-templates', icon: 'ShieldCheck', moduleKey: 'admin' },
      { label: 'Tool Builder', path: '/tools/custom/builder', icon: 'Wrench', moduleKey: 'admin' },
      { label: 'Automation Preferences', path: '/admin/automation-preferences', icon: 'SlidersHorizontal', moduleKey: 'superAdmin' },
      { label: 'Connections', path: '/admin/connections', icon: 'Cable', moduleKey: 'superAdmin' },
      { label: 'Settings', path: '/admin/settings', icon: 'Settings', moduleKey: 'superAdmin' },
    ],
  },
];
