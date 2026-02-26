import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable confirmation modal for agent edit operations.
 * Props:
 *   open       - boolean
 *   title      - modal heading
 *   message    - body text
 *   confirmLabel - primary button text (default "Confirm")
 *   confirmVariant - "danger" | "primary" (default "primary")
 *   onConfirm  - callback
 *   onCancel   - callback
 */
export default function AgentEditWarningModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const btnColor =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-aa-blue hover:bg-aa-blue/90 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full mx-4 p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-50">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-medium text-dark-text text-sm">{title}</h3>
            <p className="text-sm text-secondary-text mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary-text hover:text-dark-text hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
