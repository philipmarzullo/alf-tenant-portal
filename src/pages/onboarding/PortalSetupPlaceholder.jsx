import AlfMark from '../../components/shared/AlfMark';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Shown to non-super-admin users when the tenant's company profile
 * is still in draft status (onboarding not yet completed by admin).
 */
export default function PortalSetupPlaceholder() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <AlfMark variant="dark" size="lg" showTagline />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-dark-text mb-2">
            Your portal is being set up
          </h1>
          <p className="text-sm text-secondary-text mb-6">
            Your administrator is configuring your operations portal. Check back soon.
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
