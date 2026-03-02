import { FlaskConical } from 'lucide-react';

/**
 * Subtle banner indicating that a page shows sample/demo data.
 * Used on workspace pages (HR, Finance, Ops, Purchasing, Sales) that
 * display hardcoded mock data rather than live operational data.
 */
export default function SampleDataBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-medium">
      <FlaskConical size={13} />
      Sample Data — This workspace shows representative demo content
    </div>
  );
}
