import { BarChart3 } from 'lucide-react';

export default function DashboardEmptyState({ domain }) {
  return (
    <div className="text-center py-20">
      <BarChart3 size={36} className="mx-auto mb-3 text-gray-300" />
      <h3 className="text-sm font-semibold text-dark-text mb-1">No {domain} data yet</h3>
      <p className="text-sm text-secondary-text max-w-md mx-auto">
        Dashboard data will appear here once your facility data feed is connected.
        Contact your administrator if you expected to see data.
      </p>
    </div>
  );
}
