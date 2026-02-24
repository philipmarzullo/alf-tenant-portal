import { DEPT_COLORS } from '../../data/constants';

export default function DeptBadge({ dept }) {
  const color = DEPT_COLORS[dept] || DEPT_COLORS.ops;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      {dept}
    </span>
  );
}
