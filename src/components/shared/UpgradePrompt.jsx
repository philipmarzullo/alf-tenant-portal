import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { MODULE_REGISTRY } from '../../data/moduleRegistry';

/**
 * Full-page inline prompt shown by ProtectedRoute when a module
 * is locked by the tenant's subscription tier.
 */
export default function UpgradePrompt({ featureLabel, requiredTierLabel }) {
  // Resolve a human-friendly label from MODULE_REGISTRY if featureLabel is a module key
  const displayLabel = MODULE_REGISTRY[featureLabel]?.label || featureLabel;

  return (
    <div className="flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-purple-50 rounded-full">
            <Lock size={28} className="text-purple-500" />
          </div>
        </div>

        <h1 className="text-xl font-semibold text-dark-text mb-2">
          Upgrade to unlock {displayLabel}
        </h1>
        <p className="text-sm text-secondary-text mb-6">
          {displayLabel} is available on the {requiredTierLabel} plan and above.
        </p>

        <div className="flex flex-col items-center gap-3">
          <a
            href="mailto:support@alfpro.ai?subject=Upgrade inquiry"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
          >
            Contact us to upgrade
          </a>
          <Link
            to="/portal"
            className="text-sm text-secondary-text hover:text-dark-text transition-colors"
          >
            Go to Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
