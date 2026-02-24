import DeptBadge from './DeptBadge';

const PRIORITY_DOT = {
  high: 'bg-status-red',
  medium: 'bg-status-yellow',
  low: 'bg-status-green',
};

export default function TaskCard({ task, onAction }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
      <DeptBadge dept={task.dept} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-dark-text truncate">{task.description}</div>
        <div className="text-xs text-secondary-text">{task.employee} · Due {task.dueDate}</div>
      </div>
      {onAction && (
        <button
          onClick={(e) => { e.stopPropagation(); onAction(task); }}
          className="text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors whitespace-nowrap"
        >
          {task.actionLabel || 'View'}
        </button>
      )}
    </div>
  );
}
