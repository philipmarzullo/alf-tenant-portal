import { DollarSign, AlertTriangle, FileText, TrendingDown } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import ComingSoonModule from '../../components/shared/ComingSoonModule';

const METRICS = [
  { label: 'Outstanding AR', value: '$842,300', icon: DollarSign },
  { label: 'Overdue 60+', value: '$127,450', icon: AlertTriangle, color: '#DC2626' },
  { label: 'AP Pending', value: '12', icon: FileText },
  { label: 'Budget Variance', value: '-2.3%', icon: TrendingDown, color: '#EAB308' },
];

const MODULES = [
  { title: 'Accounts Receivable Management', description: 'Aging tracking, collection workflows, client billing' },
  { title: 'Accounts Payable Processing', description: 'Invoice approval, vendor payments, GL coding' },
  { title: 'Budget Tracking & Variance Analysis', description: 'Account-level monitoring, anomaly detection' },
  { title: 'Financial Reporting', description: 'Period close support, exec summaries' },
];

export default function FinanceOverview() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-6">Finance Workspace</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
        Planned Modules
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {MODULES.map((m) => (
          <ComingSoonModule key={m.title} {...m} />
        ))}
      </div>
    </div>
  );
}
