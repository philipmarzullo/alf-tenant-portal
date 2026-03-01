import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, Edit3, Star } from 'lucide-react';
import SlidePanel from '../../components/layout/SlidePanel';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const TIER_OPTIONS = [
  { value: 'operational', label: 'Operational', description: 'Ticket counts, audits, safety — no financial data', style: 'bg-gray-100 text-gray-700' },
  { value: 'managerial', label: 'Managerial', description: 'Adds ratios, trends, OT hours, site comparisons', style: 'bg-blue-50 text-blue-700' },
  { value: 'financial', label: 'Financial', description: 'Full access — budget $, actual $, variance $, spend $', style: 'bg-purple-50 text-purple-700' },
];

const ALL_DOMAINS = ['operations', 'labor', 'quality', 'timekeeping', 'safety'];

const DOMAIN_LABELS = {
  operations: 'Operations',
  labor: 'Labor',
  quality: 'Quality',
  timekeeping: 'Timekeeping',
  safety: 'Safety',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  metric_tier: 'operational',
  allowed_domains: [...ALL_DOMAINS],
  is_default: false,
};

export default function RoleTemplates() {
  const { tenantId } = useTenantId();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) return;
    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/role-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error('[RoleTemplates] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openAdd = () => {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setPanelOpen(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || '',
      metric_tier: template.metric_tier,
      allowed_domains: [...(template.allowed_domains || ALL_DOMAINS)],
      is_default: template.is_default || false,
    });
    setSaveError(null);
    setPanelOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const url = editingTemplate
        ? `${BACKEND_URL}/api/dashboards/${tenantId}/role-templates/${editingTemplate.id}`
        : `${BACKEND_URL}/api/dashboards/${tenantId}/role-templates`;

      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          metric_tier: form.metric_tier,
          allowed_domains: form.allowed_domains,
          is_default: form.is_default,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setSaveError(result.error || `Failed (${res.status})`);
        setSaving(false);
        return;
      }

      await fetchTemplates();
      setSaving(false);
      setPanelOpen(false);
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? Users assigned to it will fall back to the default template.')) return;
    setDeleting(id);

    try {
      const token = await getFreshToken();
      if (!token) return;

      await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/role-templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchTemplates();
    } catch (err) {
      console.error('[RoleTemplates] Delete error:', err.message);
    } finally {
      setDeleting(null);
    }
  };

  const toggleDomain = (domain) => {
    setForm(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.includes(domain)
        ? prev.allowed_domains.filter(d => d !== domain)
        : [...prev.allowed_domains, domain],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-light text-dark-text mb-1">Role Templates</h1>
          <p className="text-sm text-secondary-text">
            Define metric visibility tiers and domain access for different user roles.
            Assign templates to users in User Management.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
        >
          <Plus size={16} />
          Add Template
        </button>
      </div>

      {/* Template Cards */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-secondary-text">No role templates yet. Create one to control metric visibility for different user roles.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => {
            const tierOption = TIER_OPTIONS.find(o => o.value === t.metric_tier) || TIER_OPTIONS[0];
            return (
              <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-dark-text">{t.name}</h3>
                    {t.is_default && (
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 text-secondary-text hover:text-aa-blue rounded transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className="p-1.5 text-secondary-text hover:text-red-600 rounded transition-colors disabled:opacity-50"
                    >
                      {deleting === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Tier badge */}
                <div className="mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierOption.style}`}>
                    {tierOption.label}
                  </span>
                </div>

                {/* Description */}
                {t.description && (
                  <p className="text-sm text-secondary-text mb-3 line-clamp-2">{t.description}</p>
                )}

                {/* Domain pills */}
                <div className="flex flex-wrap gap-1">
                  {(t.allowed_domains || []).map(d => (
                    <span key={d} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-50 border border-gray-200 text-secondary-text">
                      {DOMAIN_LABELS[d] || d}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SlidePanel form */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingTemplate ? `Edit "${editingTemplate.name}"` : 'New Role Template'}
      >
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Template Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              placeholder="e.g. Site Manager, Executive, Field Supervisor"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
              placeholder="What this template is for..."
            />
          </div>

          {/* Metric Tier */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">Metric Visibility Tier</label>
            <div className="space-y-2">
              {TIER_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.metric_tier === opt.value
                      ? 'border-aa-blue bg-aa-blue/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="metric_tier"
                    value={opt.value}
                    checked={form.metric_tier === opt.value}
                    onChange={(e) => setForm({ ...form, metric_tier: e.target.value })}
                    className="mt-0.5 text-aa-blue focus:ring-aa-blue"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${opt.style}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-text mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Allowed Domains */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">Allowed Analytics Domains</label>
            <div className="space-y-1.5">
              {ALL_DOMAINS.map(d => (
                <label key={d} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.allowed_domains.includes(d)}
                    onChange={() => toggleDomain(d)}
                    className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                  />
                  <span className="text-sm text-dark-text group-hover:text-aa-blue transition-colors capitalize">
                    {DOMAIN_LABELS[d] || d}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Default toggle */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-dark-text">Default Template</span>
                <p className="text-xs text-secondary-text">
                  Automatically assigned to new users without an explicit template.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_default: !form.is_default })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_default ? 'bg-aa-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.is_default ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Error display */}
          {saveError && (
            <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="px-4 py-2 border border-gray-200 text-sm font-medium text-secondary-text rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
