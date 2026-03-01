import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, ArrowLeft, GripVertical,
  ChevronUp, ChevronDown, Eye, Save, Wrench, X,
  FileBarChart, Calculator, ShieldAlert, GraduationCap,
  ClipboardList, FileText, ListChecks, Package, Zap, Star,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../components/shared/ToastProvider';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const ICON_OPTIONS = [
  { value: 'Wrench', label: 'Wrench', Icon: Wrench },
  { value: 'ClipboardList', label: 'Clipboard', Icon: ClipboardList },
  { value: 'FileText', label: 'Document', Icon: FileText },
  { value: 'ListChecks', label: 'Checklist', Icon: ListChecks },
  { value: 'FileBarChart', label: 'Chart', Icon: FileBarChart },
  { value: 'Calculator', label: 'Calculator', Icon: Calculator },
  { value: 'ShieldAlert', label: 'Shield', Icon: ShieldAlert },
  { value: 'GraduationCap', label: 'Education', Icon: GraduationCap },
  { value: 'Package', label: 'Package', Icon: Package },
  { value: 'Zap', label: 'Zap', Icon: Zap },
  { value: 'Star', label: 'Star', Icon: Star },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkboxGroup', label: 'Checkbox Group' },
];

async function apiFetch(path, options = {}) {
  const token = await getFreshToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${BACKEND_URL}/api/custom-tools${path}`, {
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

function FormFieldPreview({ field }) {
  const baseClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50';

  switch (field.type) {
    case 'text':
      return <input type="text" disabled placeholder={field.placeholder || field.label} className={baseClass} />;
    case 'textarea':
      return <textarea disabled placeholder={field.placeholder || field.label} rows={2} className={`${baseClass} resize-none`} />;
    case 'date':
      return <input type="date" disabled className={baseClass} />;
    case 'select':
      return (
        <select disabled className={`${baseClass} bg-gray-50`}>
          <option>Select...</option>
          {(field.options || []).map(opt => <option key={opt}>{opt}</option>)}
        </select>
      );
    case 'checkboxGroup':
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {(field.options || []).map(opt => (
            <label key={opt} className="flex items-center gap-2 text-xs text-secondary-text">
              <input type="checkbox" disabled className="w-3.5 h-3.5 rounded border-gray-300" />
              {opt}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function CustomToolBuilder() {
  const { isAdmin } = useUser();
  const toast = useToast();
  const { tenantId } = useTenantId();

  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list view, object = edit form
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTools(); }, []);

  async function loadTools() {
    setLoading(true);
    try {
      const data = await apiFetch(`/${tenantId}/all`);
      setTools(data);
    } catch (err) {
      toast(err.message, 'error');
    }
    setLoading(false);
  }

  function startCreate() {
    setEditing({
      id: null,
      label: '',
      description: '',
      icon: 'Wrench',
      purpose: '',
      output_format: 'text',
      intake_schema: [],
    });
  }

  function startEdit(tool) {
    setEditing({ ...tool });
  }

  async function handleSave() {
    if (!editing.label.trim()) { toast('Tool name is required', 'error'); return; }
    if (!editing.purpose.trim()) { toast('Purpose is required', 'error'); return; }

    setSaving(true);
    try {
      if (editing.id) {
        const updated = await apiFetch(`/${tenantId}/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            label: editing.label,
            description: editing.description,
            icon: editing.icon,
            purpose: editing.purpose,
            output_format: editing.output_format,
            intake_schema: editing.intake_schema,
          }),
        });
        setTools(prev => prev.map(t => t.id === updated.id ? updated : t));
        toast('Tool updated');
      } else {
        const created = await apiFetch(`/${tenantId}`, {
          method: 'POST',
          body: JSON.stringify({
            label: editing.label,
            description: editing.description,
            icon: editing.icon,
            purpose: editing.purpose,
            output_format: editing.output_format,
            intake_schema: editing.intake_schema,
          }),
        });
        setTools(prev => [...prev, created]);
        toast('Tool created');
      }
      setEditing(null);
    } catch (err) {
      toast(err.message, 'error');
    }
    setSaving(false);
  }

  async function handleDelete(tool) {
    if (!confirm(`Deactivate "${tool.label}"? Users will no longer see it.`)) return;
    try {
      await apiFetch(`/${tenantId}/${tool.id}`, { method: 'DELETE' });
      setTools(prev => prev.map(t => t.id === tool.id ? { ...t, is_active: false } : t));
      toast('Tool deactivated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleReactivate(tool) {
    try {
      const updated = await apiFetch(`/${tenantId}/${tool.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: true }),
      });
      setTools(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast('Tool reactivated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ── Schema builder helpers ──
  function addField() {
    setEditing(prev => ({
      ...prev,
      intake_schema: [
        ...prev.intake_schema,
        { key: `field_${Date.now()}`, label: '', type: 'text', required: false, placeholder: '', options: [] },
      ],
    }));
  }

  function updateField(index, updates) {
    setEditing(prev => ({
      ...prev,
      intake_schema: prev.intake_schema.map((f, i) =>
        i === index ? { ...f, ...updates, key: updates.label ? updates.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || f.key : f.key } : f
      ),
    }));
  }

  function removeField(index) {
    setEditing(prev => ({
      ...prev,
      intake_schema: prev.intake_schema.filter((_, i) => i !== index),
    }));
  }

  function moveField(index, dir) {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= editing.intake_schema.length) return;
    setEditing(prev => {
      const arr = [...prev.intake_schema];
      [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
      return { ...prev, intake_schema: arr };
    });
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20 text-secondary-text text-sm">
        Admin access required.
      </div>
    );
  }

  // ── Edit / Create view ──
  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm text-secondary-text hover:text-dark-text mb-4">
          <ArrowLeft size={14} /> Back to Tools
        </button>

        <h1 className="text-2xl font-light text-dark-text mb-1">
          {editing.id ? 'Edit Tool' : 'Create Custom Tool'}
        </h1>
        <p className="text-sm text-secondary-text mb-6">
          Define the tool's purpose and intake form. The AI prompt is built automatically from the purpose and field values.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">Tool Details</h2>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Tool Name *</label>
                <input
                  type="text"
                  value={editing.label}
                  onChange={e => setEditing(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Site Inspection Checklist"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Description</label>
                <input
                  type="text"
                  value={editing.description || ''}
                  onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description for the tools list"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Purpose *</label>
                <textarea
                  value={editing.purpose}
                  onChange={e => setEditing(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="What should this tool generate? e.g., Generate a detailed site inspection checklist for a facilities manager based on the building type and areas to inspect."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
                />
                <p className="text-[11px] text-secondary-text mt-1">This tells the AI what to produce. Be specific about the output format and audience.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Icon</label>
                  <select
                    value={editing.icon}
                    onChange={e => setEditing(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:border-aa-blue"
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Output Format</label>
                  <select
                    value={editing.output_format}
                    onChange={e => setEditing(prev => ({ ...prev, output_format: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:border-aa-blue"
                  >
                    <option value="text">Text</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Schema Builder */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">Intake Fields</h2>
                <button
                  onClick={addField}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-md hover:bg-aa-blue/10 transition-colors"
                >
                  <Plus size={12} /> Add Field
                </button>
              </div>

              {editing.intake_schema.length === 0 ? (
                <p className="text-xs text-secondary-text text-center py-4">No fields yet. Add fields to create the intake form.</p>
              ) : (
                <div className="space-y-3">
                  {editing.intake_schema.map((field, idx) => (
                    <div key={field.key + idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-0.5 mt-1">
                          <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30">
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={() => moveField(idx, 1)} disabled={idx === editing.intake_schema.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30">
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={field.label}
                              onChange={e => updateField(idx, { label: e.target.value })}
                              placeholder="Field label"
                              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                            />
                            <select
                              value={field.type}
                              onChange={e => updateField(idx, { type: e.target.value })}
                              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-aa-blue"
                            >
                              {FIELD_TYPES.map(ft => (
                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={e => updateField(idx, { placeholder: e.target.value })}
                            placeholder="Placeholder text (optional)"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                          />
                          {(field.type === 'select' || field.type === 'checkboxGroup') && (
                            <input
                              type="text"
                              value={(field.options || []).join(', ')}
                              onChange={e => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              placeholder="Options (comma-separated)"
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                            />
                          )}
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={e => updateField(idx, { required: e.target.checked })}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                            />
                            <span className="text-xs text-secondary-text">Required</span>
                          </label>
                        </div>
                        <button onClick={() => removeField(idx)} className="text-gray-300 hover:text-red-500 mt-1">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editing.id ? 'Save Changes' : 'Create Tool'}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 text-sm font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye size={14} className="text-secondary-text" />
                <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">Live Preview</h2>
              </div>

              <h3 className="text-lg font-light text-dark-text mb-1">
                {editing.label || 'Untitled Tool'}
              </h3>
              {editing.description && (
                <p className="text-xs text-secondary-text mb-4">{editing.description}</p>
              )}

              {editing.intake_schema.length === 0 ? (
                <div className="text-center py-6 text-xs text-secondary-text border-2 border-dashed border-gray-200 rounded-lg">
                  Add intake fields to see the form preview
                </div>
              ) : (
                <div className="space-y-3">
                  {editing.intake_schema.map((field, idx) => (
                    <div key={idx}>
                      <label className="block text-xs font-medium text-secondary-text mb-1">
                        {field.label || 'Unlabeled Field'}{field.required && ' *'}
                      </label>
                      <FormFieldPreview field={field} />
                    </div>
                  ))}
                  <button disabled className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-aa-blue/60 rounded-md mt-2">
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-light text-dark-text">Tool Builder</h1>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors"
        >
          <Plus size={14} /> New Tool
        </button>
      </div>
      <p className="text-sm text-secondary-text mb-6">
        Create custom AI-powered tools for your team. Define a purpose and intake form — the AI handles the rest.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="text-aa-blue animate-spin" />
        </div>
      ) : tools.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Wrench size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-sm font-medium text-dark-text mb-1">No custom tools yet</div>
          <div className="text-xs text-secondary-text mb-4">
            Create your first custom tool to give your team AI-powered document generation.
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
          >
            <Plus size={14} /> Create First Tool
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => {
            const IconOpt = ICON_OPTIONS.find(o => o.value === tool.icon);
            const IconComp = IconOpt?.Icon || Wrench;
            return (
              <div
                key={tool.id}
                className={`bg-white rounded-lg border border-gray-200 p-4 ${!tool.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-aa-blue/10 flex items-center justify-center shrink-0">
                    <IconComp size={16} className="text-aa-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-dark-text truncate">{tool.label}</h3>
                      {!tool.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">Inactive</span>
                      )}
                    </div>
                    {tool.description && (
                      <p className="text-xs text-secondary-text mt-0.5 line-clamp-2">{tool.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-secondary-text mb-3">
                  <span>{(tool.intake_schema || []).length} fields</span>
                  <span className="text-gray-300">|</span>
                  <span>{tool.output_format}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(tool)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-md hover:bg-aa-blue/10 transition-colors"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                  {tool.is_active ? (
                    <button
                      onClick={() => handleDelete(tool)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={10} /> Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(tool)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                    >
                      Reactivate
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
