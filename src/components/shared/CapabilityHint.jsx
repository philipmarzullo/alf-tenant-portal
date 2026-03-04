import { Link } from 'react-router-dom';
import { Cable } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';

/**
 * Inline contextual hint prompting users to connect an integration.
 * Returns null when the capability is already connected.
 *
 * Admin users get a link to the Connections page.
 * Non-admin users see plain text.
 */
export default function CapabilityHint({ capability, message }) {
  const { isAdmin } = useUser();
  const { hasCapability } = useTenantPortal();

  if (hasCapability(capability)) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-teal-600">
      <Cable size={12} className="shrink-0" />
      {isAdmin ? (
        <Link to="/portal/admin/connections" className="hover:underline">
          {message}
        </Link>
      ) : (
        <span>{message}</span>
      )}
    </div>
  );
}
