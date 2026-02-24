import EmptyState from '../../components/shared/EmptyState';

export default function SalesDeckBuilder() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-6">Sales Deck Builder</h1>
      <EmptyState title="Sales Deck Builder" description="Generate prospect-specific sales decks. Intake form coming in next build step." />
    </div>
  );
}
