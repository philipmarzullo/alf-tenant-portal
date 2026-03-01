import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useTenantId } from '../../contexts/TenantIdContext';
import { supabase } from '../../lib/supabase';

/**
 * Post-onboarding dismissible banner encouraging document upload.
 * Only shown to admins/super-admins when no docs exist yet.
 * Persists dismissal in localStorage.
 */
export default function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('onboarding_banner_dismissed') === 'true'
  );
  const [hasDocs, setHasDocs] = useState(null);
  const { isAdmin } = useUser();
  const { tenantId } = useTenantId();

  useEffect(() => {
    if (dismissed || !isAdmin || !tenantId) return;

    supabase
      .from('tenant_documents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .then(({ count }) => {
        setHasDocs((count || 0) > 0);
      });
  }, [dismissed, isAdmin, tenantId]);

  if (dismissed || !isAdmin || hasDocs !== false) return null;

  function handleDismiss() {
    localStorage.setItem('onboarding_banner_dismissed', 'true');
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm mb-4 bg-blue-50 border-blue-200 text-blue-800">
      <BookOpen size={16} className="mt-0.5 shrink-0 text-blue-500" />
      <span className="flex-1">
        Upload your SOPs and operational documents to the{' '}
        <Link to="/portal/admin/knowledge" className="underline font-medium">Knowledge Base</Link>{' '}
        to unlock full agent intelligence.
      </span>
      <button
        onClick={handleDismiss}
        className="p-0.5 text-blue-400 hover:text-blue-600 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
