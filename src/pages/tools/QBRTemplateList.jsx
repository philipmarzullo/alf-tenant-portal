import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Copy, Trash2, Loader2, RotateCcw, FileBarChart } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../components/shared/ToastProvider';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

async function apiFetch(path, options = {}) {
  const token = await getFreshToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${BACKEND_URL}/api/qbr-templates${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export default function QBRTemplateList() {
  const { isAdmin } = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const { tenantId } = useTenantId();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await apiFetch(`/${tenantId}/all`);
      setTemplates(data);
    } catch (err) {
      toast(err.message, 'error');
    }
    setLoading(false);
  }

  async function handleDuplicate(template) {
    try {
      const created = await apiFetch(`/${tenantId}/${template.id}/duplicate`, { method: 'POST' });
      setTemplates(prev => [...prev, created]);
      toast('Template duplicated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDeactivate(template) {
    if (!confirm(`Deactivate "${template.name}"? Users will no longer see it.`)) return;
    try {
      await apiFetch(`/${tenantId}/${template.id}`, { method: 'DELETE' });
      setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, is_active: false } : t));
      toast('Template deactivated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleReactivate(template) {
    try {
      const updated = await apiFetch(`/${tenantId}/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: true }),
      });
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast('Template reactivated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-secondary-text text-sm">
        Admin access required.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-light text-dark-text">QBR Templates</h1>
        <button
          onClick={() => navigate('/portal/tools/qbr-templates/new')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors"
        >
          <Plus size={14} /> New Template
        </button>
      </div>
      <p className="text-sm text-secondary-text mb-6">
        Define QBR structures for your team. Each template becomes a tool with its own form, AI generation, and PPTX output.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="text-aa-blue animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <FileBarChart size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-sm font-medium text-dark-text mb-1">No QBR templates yet</div>
          <div className="text-xs text-secondary-text mb-4">
            Create your first template to give your team structured quarterly review generation.
          </div>
          <button
            onClick={() => navigate('/portal/tools/qbr-templates/new')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
          >
            <Plus size={14} /> Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => {
            const sectionCount = (template.sections || []).length;
            const fieldCount = (template.sections || []).reduce((sum, s) => sum + (s.fields || []).length, 0);
            return (
              <div
                key={template.id}
                className={`bg-white rounded-lg border border-gray-200 p-4 ${!template.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-aa-blue/10 flex items-center justify-center shrink-0">
                    <FileBarChart size={16} className="text-aa-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-dark-text truncate">{template.name}</h3>
                      {!template.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">Inactive</span>
                      )}
                      {template.is_default && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-aa-blue/10 text-aa-blue rounded">Default</span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-secondary-text mt-0.5 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-secondary-text mb-3">
                  <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
                  <span className="text-gray-300">|</span>
                  <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/portal/tools/qbr-templates/edit/${template.id}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-md hover:bg-aa-blue/10 transition-colors"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-secondary-text bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Copy size={10} /> Duplicate
                  </button>
                  {template.is_active ? (
                    <button
                      onClick={() => handleDeactivate(template)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={10} /> Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(template)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                    >
                      <RotateCcw size={10} /> Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
