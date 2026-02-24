import EmptyState from '../../components/shared/EmptyState';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-6">Settings</h1>
      <EmptyState title="Settings" description="Portal configuration and preferences." />
    </div>
  );
}
