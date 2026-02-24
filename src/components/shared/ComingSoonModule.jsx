import { Lock } from 'lucide-react';

export default function ComingSoonModule({ title, description }) {
  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-6 opacity-70">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-100 rounded-lg shrink-0">
          <Lock size={18} className="text-secondary-text" />
        </div>
        <div>
          <div className="font-semibold text-dark-text text-sm">{title}</div>
          <div className="text-xs text-secondary-text mt-1 leading-relaxed">{description}</div>
          <button className="mt-3 text-xs font-medium text-secondary-text hover:text-dark-text transition-colors border border-gray-200 rounded px-3 py-1.5">
            Map This Process
          </button>
        </div>
      </div>
    </div>
  );
}
