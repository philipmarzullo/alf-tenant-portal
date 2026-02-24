import EmptyState from '../../components/shared/EmptyState';

export default function AgentManagement() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-6">Agent Management</h1>
      <EmptyState title="Agent Management" description="Agent configuration cards, action logs, and API usage charts coming in next build step." />
    </div>
  );
}
