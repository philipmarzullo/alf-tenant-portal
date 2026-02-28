import { BarChart3 } from 'lucide-react';

const MESSAGES = {
  home: {
    title: 'No operational data connected yet',
    body: 'Your overview will populate automatically once your facility data feed is active. Contact your administrator to get started.',
  },
};

export default function DashboardEmptyState({ domain }) {
  const msg = MESSAGES[domain] || {
    title: `No ${domain} data yet`,
    body: 'Dashboard data will appear here once your facility data feed is connected. Contact your administrator if you expected to see data.',
  };

  return (
    <div className="text-center py-20">
      <BarChart3 size={36} className="mx-auto mb-3 text-gray-300" />
      <h3 className="text-sm font-semibold text-dark-text mb-1">{msg.title}</h3>
      <p className="text-sm text-secondary-text max-w-md mx-auto">{msg.body}</p>
    </div>
  );
}
