export const MODULE_DEFINITIONS = [
  { key: 'hr', label: 'HR', group: 'WORKSPACES', path: '/hr' },
  { key: 'finance', label: 'Finance', group: 'WORKSPACES', path: '/finance' },
  { key: 'purchasing', label: 'Purchasing', group: 'WORKSPACES', path: '/purchasing' },
  { key: 'sales', label: 'Sales', group: 'WORKSPACES', path: '/sales' },
  { key: 'ops', label: 'Operations', group: 'WORKSPACES', path: '/ops' },
  { key: 'dashboards', label: 'Dashboards', group: 'ANALYTICS', path: '/dashboards' },
  { key: 'qbu', label: 'Quarterly Review Builder', group: 'TOOLS', path: '/tools/qbu' },
  { key: 'salesDeck', label: 'Proposal Builder', group: 'TOOLS', path: '/tools/sales-deck' },
  { key: 'sop-builder', label: 'SOP Builder', group: 'TOOLS', path: '/tools/sop-builder' },
  { key: 'rfp-response', label: 'RFP Response Builder', group: 'TOOLS', path: '/tools/rfp-response' },
  { key: 'admin', label: 'Admin', group: 'ADMIN', path: '/admin' },
];

// Individual tool module keys — used to expand 'tools' group check
export const TOOL_MODULE_KEYS = new Set(
  MODULE_DEFINITIONS.filter(m => m.group === 'TOOLS').map(m => m.key)
);
