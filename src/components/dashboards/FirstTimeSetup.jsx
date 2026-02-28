import { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, ArrowRight, LayoutGrid } from 'lucide-react';
import { useRBAC } from '../../contexts/RBACContext';
import { useUser } from '../../contexts/UserContext';
import { supabase, getFreshToken } from '../../lib/supabase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const TENANT_ID = import.meta.env.VITE_TENANT_ID;

const TIER_BADGES = {
  operational: { label: 'Operational', style: 'bg-gray-100 text-gray-700' },
  managerial: { label: 'Managerial', style: 'bg-blue-50 text-blue-700' },
  financial: { label: 'Financial', style: 'bg-purple-50 text-purple-700' },
};

const DOMAIN_LABELS = {
  operations: 'Operations',
  labor: 'Labor',
  quality: 'Quality',
  timekeeping: 'Timekeeping',
  safety: 'Safety',
};

/**
 * First-time setup for dashboards. Works in two modes:
 *
 * 1. Home/global mode (no domain prop):
 *    Lets user pick a template → sets dashboard_template_id on profile.
 *
 * 2. Domain mode (domain prop provided, e.g. "operations"):
 *    Lets user pick a template filtered by domain → writes user_dashboard_configs
 *    for that domain with the template's default KPI layout.
 *
 * Props:
 *   onComplete - () => void — called after template is selected
 *   domain     - optional string (e.g. 'operations') — domain tab mode
 */
export default function FirstTimeSetup({ onComplete, domain }) {
  const { templateName, refreshRBAC } = useRBAC();
  const { currentUser } = useUser();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);

  const fetchTemplates = useCallback(async () => {
    if (!TENANT_ID) return;
    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/role-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        let data = await res.json();
        // In domain mode, filter templates to those whose allowed_domains include this domain
        if (domain) {
          data = data.filter(t => (t.allowed_domains || []).includes(domain));
        }
        setTemplates(data);
      }
    } catch (err) {
      console.error('[FirstTimeSetup] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const selectTemplate = async (templateId) => {
    setSelecting(templateId);
    try {
      if (domain) {
        // Domain mode: save user_dashboard_configs for this domain
        // Use the template's defaults as initial config
        const template = templates.find(t => t.id === templateId);
        const config = template?.default_hero_metrics
          ? { defaultHeroMetrics: template.default_hero_metrics, templateName: template.name }
          : {};

        const token = await getFreshToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/user-config/${domain}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to save config');
        }
      } else {
        // Home mode: update profile with selected template
        const { error } = await supabase
          .from('profiles')
          .update({ dashboard_template_id: templateId })
          .eq('id', currentUser.id);

        if (error) throw error;

        // Refresh RBAC to pick up new tier/domains
        await refreshRBAC();
      }
      onComplete();
    } catch (err) {
      console.error('[FirstTimeSetup] Selection error:', err.message);
      setSelecting(null);
    }
  };

  const startBlank = async () => {
    setSelecting('blank');
    try {
      if (domain) {
        // Save empty config to mark domain as set up
        const token = await getFreshToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/user-config/${domain}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config: { initialized: true } }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to save config');
        }
      }
      onComplete();
    } catch (err) {
      console.error('[FirstTimeSetup] Blank start error:', err.message);
      setSelecting(null);
    }
  };

  // If admin already assigned a template (home mode only, not domain mode)
  if (!domain && templateName) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-light text-dark-text mb-2">Welcome to your dashboard</h2>
          <p className="text-sm text-secondary-text mb-6">
            Your admin has assigned you the <strong>{templateName}</strong> template.
            You can customize your dashboard layout using the Customize button.
          </p>
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
          >
            Get Started
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  const title = domain
    ? `Set up your ${DOMAIN_LABELS[domain] || domain} dashboard`
    : 'Choose your dashboard view';

  const subtitle = domain
    ? 'Select a starting template, or start with the full default layout. You can always customize later.'
    : 'Select a template that matches your role. This determines which metrics and data you see. You can always customize later.';

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-light text-dark-text mb-2">{title}</h2>
        <p className="text-sm text-secondary-text">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => {
          const tierOption = TIER_BADGES[t.metric_tier] || TIER_BADGES.operational;
          const isSelecting = selecting === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTemplate(t.id)}
              disabled={selecting !== null}
              className={`text-left bg-white rounded-xl border-2 p-5 transition-all ${
                isSelecting
                  ? 'border-aa-blue bg-aa-blue/5'
                  : 'border-gray-200 hover:border-aa-blue/50 hover:shadow-sm'
              } ${selecting !== null && !isSelecting ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-medium text-dark-text">{t.name}</h3>
                {t.is_default && <Star size={14} className="text-amber-500 fill-amber-500" />}
              </div>

              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierOption.style} mb-3`}>
                {tierOption.label}
              </span>

              {t.description && (
                <p className="text-sm text-secondary-text mb-3">{t.description}</p>
              )}

              <div className="flex flex-wrap gap-1">
                {(t.allowed_domains || []).map(d => (
                  <span key={d} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 border border-gray-200 text-secondary-text">
                    {DOMAIN_LABELS[d] || d}
                  </span>
                ))}
              </div>

              {isSelecting && (
                <div className="flex items-center gap-2 mt-3 text-sm text-aa-blue">
                  <Loader2 size={14} className="animate-spin" /> Applying...
                </div>
              )}
            </button>
          );
        })}

        {/* Start blank option — always available */}
        <button
          onClick={startBlank}
          disabled={selecting !== null}
          className={`text-left bg-white rounded-xl border-2 border-dashed p-5 transition-all ${
            selecting === 'blank'
              ? 'border-aa-blue bg-aa-blue/5'
              : 'border-gray-300 hover:border-aa-blue/50 hover:shadow-sm'
          } ${selecting !== null && selecting !== 'blank' ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-medium text-dark-text">Start with defaults</h3>
            <LayoutGrid size={14} className="text-secondary-text" />
          </div>
          <p className="text-sm text-secondary-text mb-3">
            {domain
              ? 'Use the full default layout for this dashboard. You can customize from there.'
              : 'Continue with the default dashboard configuration. You can customize later.'}
          </p>
          {selecting === 'blank' && (
            <div className="flex items-center gap-2 mt-3 text-sm text-aa-blue">
              <Loader2 size={14} className="animate-spin" /> Setting up...
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
