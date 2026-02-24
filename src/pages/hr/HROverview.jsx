import { Users, FileText, ClipboardCheck, Calendar } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable from '../../components/shared/DataTable';

const METRICS = [
  { label: 'Active Employees', value: '2,147', icon: Users },
  { label: 'Open Leave Requests', value: '6', icon: FileText },
  { label: 'Pending Enrollments', value: '8', icon: ClipboardCheck },
  { label: 'Upcoming Union Rate Changes', value: '3', icon: Calendar, color: '#EAB308' },
];

const TASKS = [
  { id: 1, priority: '🔴', task: 'FMLA certification overdue', employee: 'James Rodriguez', type: 'Medical Leave', dueDate: 'Feb 20', status: 'overdue', action: 'Follow Up' },
  { id: 2, priority: '🟡', task: 'Benefits enrollment closing', employee: 'Aisha Patel', type: 'Benefits', dueDate: 'Mar 1', status: 'pending', action: 'Review' },
  { id: 3, priority: '🟢', task: 'Return-to-work check-in', employee: 'Carlos Mendez', type: 'Personal Leave', dueDate: 'Mar 10', status: 'inProgress', action: 'View' },
  { id: 4, priority: '🟡', task: 'Union rate change pending — 32BJ Bronx Residential', employee: '(batch)', type: 'Pay Rate', dueDate: 'Mar 15', status: 'pending', action: 'Process' },
  { id: 5, priority: '🔴', task: 'Pay rate VP approval stale — 5 days', employee: 'David Kim', type: 'Pay Rate', dueDate: 'Feb 19', status: 'overdue', action: 'Escalate' },
];

const columns = [
  { key: 'priority', label: '', render: (v) => <span className="text-base">{v}</span> },
  { key: 'task', label: 'Task', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
  { key: 'employee', label: 'Employee' },
  { key: 'type', label: 'Type' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'action', label: '', render: (v) => (
    <button className="text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors">{v}</button>
  )},
];

export default function HROverview() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider">
          Task Queue
        </h2>
      </div>
      <DataTable columns={columns} data={TASKS} />
    </div>
  );
}
