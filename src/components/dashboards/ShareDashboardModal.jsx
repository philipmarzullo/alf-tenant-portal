import { useState, useEffect } from 'react';
import { X, Share2, Loader2, Trash2 } from 'lucide-react';
import { supabase, getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function ShareDashboardModal({ open, onClose, dashboardKey, dashboardLabel }) {
  const { tenantId } = useTenantId();
  const [users, setUsers] = useState([]);
  const [existingShares, setExistingShares] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Load users + existing shares
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const token = await getFreshToken();
        if (!token || cancelled) return;

        // Fetch shares
        const sharesRes = await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/shares`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (sharesRes.ok) {
          const json = await sharesRes.json();
          setExistingShares((json.shares || []).filter(s => s.dashboard_key === dashboardKey));
        }

        // Fetch tenant users for picker
        if (!supabase) return;
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .not('role', 'in', '("admin","super-admin")')
          .order('full_name');

        if (!cancelled && profiles) setUsers(profiles);
      } catch (err) {
        console.warn('[ShareModal] Load error:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, dashboardKey, tenantId]);

  async function handleShare() {
    if (!selectedUser) return;
    setSharing(true);
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/shares`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardKey, sharedWith: selectedUser }),
      });
      if (res.ok) {
        const { share } = await res.json();
        const user = users.find(u => u.id === selectedUser);
        setExistingShares(prev => [...prev, { ...share, shared_with_profile: user }]);
        setSelectedUser('');
      }
    } catch (err) {
      console.error('[ShareModal] Share error:', err.message);
    } finally {
      setSharing(false);
    }
  }

  async function handleRevoke(shareId) {
    try {
      const token = await getFreshToken();
      await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/shares/${shareId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setExistingShares(prev => prev.filter(s => s.id !== shareId));
    } catch (err) {
      console.error('[ShareModal] Revoke error:', err.message);
    }
  }

  if (!open) return null;

  // Filter out users who already have access
  const sharedUserIds = new Set(existingShares.map(s => s.shared_with));
  const availableUsers = users.filter(u => !sharedUserIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-aa-blue" />
            <h2 className="text-lg font-semibold text-dark-text">Share {dashboardLabel || 'Dashboard'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-secondary-text mb-4">
          Share this dashboard view with team members. They'll get read-only access.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-aa-blue animate-spin" />
          </div>
        ) : (
          <>
            {/* Add user */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-dark-text"
              >
                <option value="">Select a user...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
              <button
                onClick={handleShare}
                disabled={!selectedUser || sharing}
                className="px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 disabled:opacity-50"
              >
                {sharing ? <Loader2 size={14} className="animate-spin" /> : 'Share'}
              </button>
            </div>

            {/* Existing shares */}
            {existingShares.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                  Shared with ({existingShares.length})
                </h3>
                <div className="space-y-2">
                  {existingShares.map(share => (
                    <div key={share.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <div className="text-sm text-dark-text">
                        {share.shared_with_profile?.full_name || share.shared_with_profile?.email || share.shared_with}
                      </div>
                      <button
                        onClick={() => handleRevoke(share.id)}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                        title="Revoke access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
