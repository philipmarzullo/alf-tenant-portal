import { useTenantPortal } from '../../contexts/TenantPortalContext';

export default function DeptBadge({ dept }) {
  const { getWorkspaceColor } = useTenantPortal();
  const color = getWorkspaceColor(dept);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      {dept}
    </span>
  );
}
