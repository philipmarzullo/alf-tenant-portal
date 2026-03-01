import AlfMark from '../../components/shared/AlfMark';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Layout wrapper for all onboarding screens.
 * Warm white background, AlfMark in top-left, centered content.
 */
export default function OnboardingShell({ children, maxWidth = 'max-w-2xl' }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="flex items-center justify-between px-8 py-6">
        <AlfMark variant="light" size="md" />
        <button
          onClick={signOut}
          className="text-xs text-secondary-text hover:text-dark-text transition-colors"
        >
          Sign Out
        </button>
      </div>
      <div className={`${maxWidth} mx-auto px-6 pb-16`}>
        {children}
      </div>
    </div>
  );
}
