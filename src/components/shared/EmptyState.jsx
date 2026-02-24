import { Inbox } from 'lucide-react';

export default function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <Inbox size={32} className="text-secondary-text" />
      </div>
      <div className="font-semibold text-dark-text mb-1">{title || "Nothing here yet"}</div>
      <div className="text-sm text-secondary-text max-w-sm">
        {description || "This section will be populated as processes are mapped."}
      </div>
    </div>
  );
}
