import { Lock, X } from 'lucide-react';

/**
 * Modal shown when a user clicks a tier-locked sidebar item.
 * Displays upgrade messaging and a contact CTA.
 */
export default function UpgradeModal({ open, onClose, featureLabel, requiredTierLabel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="p-3 bg-purple-50 rounded-full">
            <Lock size={24} className="text-purple-500" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-dark-text text-center mb-2">
          Upgrade to {requiredTierLabel}
        </h2>
        <p className="text-sm text-secondary-text text-center mb-6">
          {featureLabel} is available on the {requiredTierLabel} plan and above.
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="mailto:support@alfpro.ai?subject=Upgrade inquiry"
            className="w-full px-4 py-2.5 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors text-center"
          >
            Contact us to upgrade
          </a>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-secondary-text hover:text-dark-text transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
