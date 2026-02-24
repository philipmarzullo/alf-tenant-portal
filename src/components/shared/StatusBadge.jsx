import { STATUS } from '../../data/constants';

export default function StatusBadge({ status }) {
  const config = STATUS[status] || STATUS.inactive;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
