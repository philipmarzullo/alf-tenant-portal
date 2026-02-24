import { Activity, AlertTriangle, Bot, Clock } from 'lucide-react';
import MetricCard from '../components/shared/MetricCard';
import TaskCard from '../components/shared/TaskCard';

const METRICS = [
  { label: 'Active Processes', value: '23', icon: Activity, trend: '↓ 3 from last week' },
  { label: 'Needs Attention', value: '4', icon: AlertTriangle, color: '#DC2626' },
  { label: 'Agent Actions Today', value: '47', icon: Bot },
  { label: 'Pending Approvals', value: '8', icon: Clock },
];

const TASKS = [
  { id: 1, priority: 'high', dept: 'hr', description: 'FMLA certification overdue', employee: 'James Rodriguez', dueDate: 'Feb 20 (OVERDUE)', actionLabel: 'Follow Up' },
  { id: 2, priority: 'medium', dept: 'hr', description: 'Benefits enrollment closing', employee: 'Aisha Patel', dueDate: 'Mar 1', actionLabel: 'Review' },
  { id: 3, priority: 'low', dept: 'hr', description: 'Return-to-work check-in', employee: 'Carlos Mendez', dueDate: 'Mar 10', actionLabel: 'View' },
  { id: 4, priority: 'medium', dept: 'hr', description: 'Union rate change pending — 32BJ Bronx Residential', employee: 'Batch', dueDate: 'Mar 15', actionLabel: 'Process' },
  { id: 5, priority: 'high', dept: 'hr', description: 'Pay rate VP approval stale — 5 days', employee: 'David Kim', dueDate: 'Feb 19 (OVERDUE)', actionLabel: 'Escalate' },
  { id: 6, priority: 'medium', dept: 'finance', description: 'AR 60+ days — Greenfield University', employee: '$127,450', dueDate: 'Review', actionLabel: 'View' },
];

const ACTIVITY = [
  { id: 1, text: 'HR Agent drafted benefits reminder for 12 employees', time: '2h ago' },
  { id: 2, text: 'HR Agent flagged 32BJ pay increase effective Jan 1 — 847 employees affected', time: '4h ago' },
  { id: 3, text: 'Finance Agent summarized Greenfield University account', time: '6h ago' },
  { id: 4, text: 'HR Agent generated WinTeam update for Sandra Lopez pay change', time: '8h ago' },
  { id: 5, text: 'QBU Builder generated Q4 2025 deck for Fordham University', time: 'Yesterday' },
];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-6">Dashboard</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left column — Needs Attention */}
        <div className="col-span-3">
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Needs Your Attention
          </h2>
          <div className="flex flex-col gap-2">
            {TASKS.map((task) => (
              <TaskCard key={task.id} task={task} onAction={() => {}} />
            ))}
          </div>
        </div>

        {/* Right column — Agent Activity */}
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Recent Agent Activity
          </h2>
          <div className="bg-white rounded-lg border border-gray-200">
            {ACTIVITY.map((item, i) => (
              <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${i < ACTIVITY.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="p-1.5 bg-aa-blue/10 rounded shrink-0 mt-0.5">
                  <Bot size={14} className="text-aa-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-dark-text leading-snug">{item.text}</div>
                  <div className="text-xs text-secondary-text mt-1">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
