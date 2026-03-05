import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, ChevronUp, ChevronDown,
  ChevronRight, X, GripVertical, Copy, FileBarChart,
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../components/shared/ToastProvider';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'table', label: 'Table' },
  { value: 'photos', label: 'Photos' },
  { value: 'bullets', label: 'Bullet List' },
];

const PPTX_LAYOUTS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'bullets', label: 'Bullets' },
  { value: 'table', label: 'Table' },
  { value: 'key_value', label: 'Key-Value Pairs' },
  { value: 'photo', label: 'Photo Grid' },
  { value: 'narrative', label: 'Narrative Text' },
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

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

function emptyField() {
  return {
    key: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
  };
}

function emptySection(order) {
  return {
    key: `section_${Date.now()}`,
    label: '',
    description: '',
    slide_label: '',
    pptx_layout: 'auto',
    agent_hint: '',
    order,
    fields: [],
  };
}

const DEFAULT_COVER_FIELDS = {
  show_client_name: true,
  show_quarter: true,
  show_date: true,
  show_job_name: false,
  show_our_team: true,
  show_client_team: true,
  custom_fields: [],
};

export default function QBRTemplateEditor() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const toast = useToast();
  const { tenantId } = useTenantId();

  const isNew = !templateId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Template state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentInstructions, setAgentInstructions] = useState('');
  const [sections, setSections] = useState([]);
  const [coverFields, setCoverFields] = useState({ ...DEFAULT_COVER_FIELDS });
  const [pptxSettings, setPptxSettings] = useState({ closing_message: 'Thank you for your partnership' });
  const [isDefault, setIsDefault] = useState(false);

  // Which section is expanded
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    if (!isNew) loadTemplate();
  }, [templateId]);

  async function loadTemplate() {
    setLoading(true);
    try {
      const data = await apiFetch(`/${tenantId}/${templateId}`);
      setName(data.name || '');
      setDescription(data.description || '');
      setAgentInstructions(data.agent_instructions || '');
      setSections(data.sections || []);
      setCoverFields({ ...DEFAULT_COVER_FIELDS, ...(data.cover_fields || {}) });
      setPptxSettings(data.pptx_settings || { closing_message: '' });
      setIsDefault(data.is_default || false);
    } catch (err) {
      toast(err.message, 'error');
      navigate('/portal/tools/qbr-templates');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!name.trim()) { toast('Template name is required', 'error'); return; }

    // Validate sections have labels
    for (let i = 0; i < sections.length; i++) {
      if (!sections[i].label.trim()) {
        toast(`Section ${i + 1} needs a label`, 'error');
        setExpandedSection(i);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        agent_instructions: agentInstructions,
        sections: sections.map((s, i) => ({
          ...s,
          key: slugify(s.label) || s.key,
          order: i,
          fields: s.fields.map(f => ({
            ...f,
            key: slugify(f.label) || f.key,
          })),
        })),
        cover_fields: coverFields,
        pptx_settings: pptxSettings,
        is_default: isDefault,
      };

      if (isNew) {
        const created = await apiFetch(`/${tenantId}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast('Template created');
        navigate(`/portal/tools/qbr-templates/edit/${created.id}`, { replace: true });
      } else {
        await apiFetch(`/${tenantId}/${templateId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast('Template saved');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
    setSaving(false);
  }

  // ── Section helpers ──
  function addSection() {
    setSections(prev => [...prev, emptySection(prev.length)]);
    setExpandedSection(sections.length);
  }

  function removeSection(index) {
    if (!confirm('Remove this section and all its fields?')) return;
    setSections(prev => prev.filter((_, i) => i !== index));
    setExpandedSection(null);
  }

  function moveSection(index, dir) {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
      return arr;
    });
    setExpandedSection(newIdx);
  }

  function updateSection(index, updates) {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  }

  // ── Field helpers ──
  function addField(sectionIndex) {
    setSections(prev => prev.map((s, i) =>
      i === sectionIndex ? { ...s, fields: [...s.fields, emptyField()] } : s
    ));
  }

  function updateField(sectionIndex, fieldIndex, updates) {
    setSections(prev => prev.map((s, si) => {
      if (si !== sectionIndex) return s;
      return {
        ...s,
        fields: s.fields.map((f, fi) =>
          fi === fieldIndex ? { ...f, ...updates } : f
        ),
      };
    }));
  }

  function removeField(sectionIndex, fieldIndex) {
    setSections(prev => prev.map((s, si) => {
      if (si !== sectionIndex) return s;
      return { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIndex) };
    }));
  }

  function moveField(sectionIndex, fieldIndex, dir) {
    const newIdx = fieldIndex + dir;
    setSections(prev => prev.map((s, si) => {
      if (si !== sectionIndex) return s;
      if (newIdx < 0 || newIdx >= s.fields.length) return s;
      const arr = [...s.fields];
      [arr[fieldIndex], arr[newIdx]] = [arr[newIdx], arr[fieldIndex]];
      return { ...s, fields: arr };
    }));
  }

  // ── Table column helpers ──
  function addColumn(sectionIndex, fieldIndex) {
    updateField(sectionIndex, fieldIndex, {
      columns: [
        ...(sections[sectionIndex].fields[fieldIndex].columns || []),
        { key: `col_${Date.now()}`, label: '', type: 'text' },
      ],
    });
  }

  function updateColumn(sectionIndex, fieldIndex, colIndex, updates) {
    const field = sections[sectionIndex].fields[fieldIndex];
    const cols = (field.columns || []).map((c, ci) =>
      ci === colIndex ? { ...c, ...updates, key: updates.label ? slugify(updates.label) || c.key : c.key } : c
    );
    updateField(sectionIndex, fieldIndex, { columns: cols });
  }

  function removeColumn(sectionIndex, fieldIndex, colIndex) {
    const field = sections[sectionIndex].fields[fieldIndex];
    updateField(sectionIndex, fieldIndex, {
      columns: (field.columns || []).filter((_, ci) => ci !== colIndex),
    });
  }

  // ── Cover custom field helpers ──
  function addCoverCustomField() {
    setCoverFields(prev => ({
      ...prev,
      custom_fields: [...(prev.custom_fields || []), { key: `custom_${Date.now()}`, label: '', type: 'text' }],
    }));
  }

  function updateCoverCustomField(index, updates) {
    setCoverFields(prev => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).map((f, i) =>
        i === index ? { ...f, ...updates, key: updates.label ? slugify(updates.label) || f.key : f.key } : f
      ),
    }));
  }

  function removeCoverCustomField(index) {
    setCoverFields(prev => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).filter((_, i) => i !== index),
    }));
  }

  if (!isAdmin) {
    return <div className="text-center py-20 text-secondary-text text-sm">Admin access required.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/portal/tools/qbr-templates')}
        className="flex items-center gap-1 text-sm text-secondary-text hover:text-dark-text mb-4"
      >
        <ArrowLeft size={14} /> Back to Templates
      </button>

      <h1 className="text-2xl font-light text-dark-text mb-1">
        {isNew ? 'Create QBR Template' : 'Edit QBR Template'}
      </h1>
      <p className="text-sm text-secondary-text mb-6">
        Define sections and fields that will make up the QBR intake form. Each section becomes a tab and generates slides.
      </p>

      <div className="space-y-5 max-w-4xl">
        {/* Template Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">Template Details</h2>

          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Quarterly Business Review"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description shown in the tools list"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Agent Instructions</label>
            <textarea
              value={agentInstructions}
              onChange={e => setAgentInstructions(e.target.value)}
              placeholder="Additional instructions for the AI when generating the QBR narrative. Leave blank for defaults."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
            />
            <p className="text-[11px] text-secondary-text mt-1">
              Custom instructions merged into the system prompt. Use this to set tone, terminology, or company-specific rules.
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
            />
            <span className="text-xs text-secondary-text">Default template (pre-selected for new QBRs)</span>
          </label>
        </div>

        {/* Cover Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">Cover Slide Configuration</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'show_client_name', label: 'Client Name' },
              { key: 'show_quarter', label: 'Quarter' },
              { key: 'show_date', label: 'Date' },
              { key: 'show_job_name', label: 'Job Name' },
              { key: 'show_our_team', label: 'Our Team Table' },
              { key: 'show_client_team', label: 'Client Team Table' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={coverFields[opt.key] || false}
                  onChange={e => setCoverFields(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                />
                <span className="text-xs text-secondary-text">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Custom cover fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-secondary-text">Custom Cover Fields</span>
              <button
                onClick={addCoverCustomField}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded hover:bg-aa-blue/10 transition-colors"
              >
                <Plus size={10} /> Add
              </button>
            </div>
            {(coverFields.custom_fields || []).map((cf, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={cf.label}
                  onChange={e => updateCoverCustomField(idx, { label: e.target.value })}
                  placeholder="Field label"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
                <select
                  value={cf.type}
                  onChange={e => updateCoverCustomField(idx, { type: e.target.value })}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-aa-blue"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                </select>
                <button onClick={() => removeCoverCustomField(idx)} className="text-gray-300 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">
              Sections ({sections.length})
            </h2>
            <button
              onClick={addSection}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-md hover:bg-aa-blue/10 transition-colors"
            >
              <Plus size={12} /> Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <p className="text-xs text-secondary-text text-center py-6">
              No sections yet. Add sections to define the QBR structure.
            </p>
          ) : (
            <div className="space-y-2">
              {sections.map((section, sIdx) => {
                const isExpanded = expandedSection === sIdx;
                return (
                  <div key={section.key + sIdx} className="border border-gray-100 rounded-lg overflow-hidden">
                    {/* Section header */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50/50'
                      }`}
                      onClick={() => setExpandedSection(isExpanded ? null : sIdx)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); moveSection(sIdx, -1); }}
                          disabled={sIdx === 0}
                          className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                        >
                          <ChevronUp size={11} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); moveSection(sIdx, 1); }}
                          disabled={sIdx === sections.length - 1}
                          className="text-gray-300 hover:text-gray-500 disabled:opacity-30"
                        >
                          <ChevronDown size={11} />
                        </button>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-gray-400 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      <span className="text-sm font-medium text-dark-text flex-1">
                        {section.label || 'Untitled Section'}
                      </span>
                      <span className="text-[11px] text-secondary-text">
                        {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                      </span>
                      {section.slide_label && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
                          {section.slide_label}
                        </span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); removeSection(sIdx); }}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Section body */}
                    {isExpanded && (
                      <div className="px-4 py-4 border-t border-gray-100 space-y-4">
                        {/* Section meta */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-secondary-text mb-1">Section Label *</label>
                            <input
                              type="text"
                              value={section.label}
                              onChange={e => updateSection(sIdx, { label: e.target.value })}
                              placeholder="e.g., Safety & Compliance"
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-secondary-text mb-1">Slide Label</label>
                            <input
                              type="text"
                              value={section.slide_label || ''}
                              onChange={e => updateSection(sIdx, { slide_label: e.target.value })}
                              placeholder="e.g., A.1"
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-secondary-text mb-1">Description</label>
                          <input
                            type="text"
                            value={section.description || ''}
                            onChange={e => updateSection(sIdx, { description: e.target.value })}
                            placeholder="Help text shown to the user filling out this section"
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-secondary-text mb-1">PPTX Layout</label>
                            <select
                              value={section.pptx_layout || 'auto'}
                              onChange={e => updateSection(sIdx, { pptx_layout: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-aa-blue"
                            >
                              {PPTX_LAYOUTS.map(l => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-secondary-text mb-1">Agent Hint</label>
                            <input
                              type="text"
                              value={section.agent_hint || ''}
                              onChange={e => updateSection(sIdx, { agent_hint: e.target.value })}
                              placeholder="Optional guidance for AI on this section"
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                            />
                          </div>
                        </div>

                        {/* Fields */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-dark-text uppercase tracking-wider">Fields</span>
                            <button
                              onClick={() => addField(sIdx)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded hover:bg-aa-blue/10 transition-colors"
                            >
                              <Plus size={10} /> Add Field
                            </button>
                          </div>

                          {section.fields.length === 0 ? (
                            <p className="text-[11px] text-secondary-text text-center py-3 border border-dashed border-gray-200 rounded">
                              No fields yet. Add fields to create the intake form for this section.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {section.fields.map((field, fIdx) => (
                                <FieldEditor
                                  key={field.key + fIdx}
                                  field={field}
                                  fieldIndex={fIdx}
                                  sectionIndex={sIdx}
                                  totalFields={section.fields.length}
                                  onUpdate={(updates) => updateField(sIdx, fIdx, updates)}
                                  onRemove={() => removeField(sIdx, fIdx)}
                                  onMove={(dir) => moveField(sIdx, fIdx, dir)}
                                  onAddColumn={() => addColumn(sIdx, fIdx)}
                                  onUpdateColumn={(ci, updates) => updateColumn(sIdx, fIdx, ci, updates)}
                                  onRemoveColumn={(ci) => removeColumn(sIdx, fIdx, ci)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PPTX Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-dark-text uppercase tracking-wider">PPTX Settings</h2>
          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Closing Message</label>
            <input
              type="text"
              value={pptxSettings.closing_message || ''}
              onChange={e => setPptxSettings(prev => ({ ...prev, closing_message: e.target.value }))}
              placeholder="e.g., Thank you for your partnership"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isNew ? 'Create Template' : 'Save Changes'}
          </button>
          <button
            onClick={() => navigate('/portal/tools/qbr-templates')}
            className="px-4 py-2.5 text-sm font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field Editor Component ──

function FieldEditor({ field, fieldIndex, sectionIndex, totalFields, onUpdate, onRemove, onMove, onAddColumn, onUpdateColumn, onRemoveColumn }) {
  const needsOptions = field.type === 'select';
  const isTable = field.type === 'table';
  const isPhotos = field.type === 'photos';
  const isBullets = field.type === 'bullets';

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 mt-1">
          <button onClick={() => onMove(-1)} disabled={fieldIndex === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30">
            <ChevronUp size={11} />
          </button>
          <button onClick={() => onMove(1)} disabled={fieldIndex === totalFields - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30">
            <ChevronDown size={11} />
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={field.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="Field label"
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
            <select
              value={field.type}
              onChange={e => {
                const updates = { type: e.target.value };
                // Initialize type-specific defaults
                if (e.target.value === 'table' && !field.columns) updates.columns = [];
                if (e.target.value === 'photos' && !field.photo_config) updates.photo_config = { allow_before_after: false, max_photos: 10 };
                if (e.target.value === 'bullets' && !field.min_rows) { updates.min_rows = 1; updates.max_rows = 10; }
                onUpdate(updates);
              }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-aa-blue"
            >
              {FIELD_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>

          {!isTable && !isPhotos && !isBullets && (
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={e => onUpdate({ placeholder: e.target.value })}
              placeholder="Placeholder text (optional)"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          )}

          {needsOptions && (
            <input
              type="text"
              value={(field.options || []).join(', ')}
              onChange={e => onUpdate({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="Options (comma-separated)"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          )}

          {/* Table columns */}
          {isTable && (
            <div className="border border-gray-200 rounded-md p-2.5 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-secondary-text">Table Columns</span>
                <button
                  onClick={onAddColumn}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded hover:bg-aa-blue/10"
                >
                  <Plus size={8} /> Column
                </button>
              </div>
              {(field.columns || []).length === 0 ? (
                <p className="text-[10px] text-secondary-text text-center py-2">No columns defined yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {(field.columns || []).map((col, ci) => (
                    <div key={ci} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={col.label}
                        onChange={e => onUpdateColumn(ci, { label: e.target.value })}
                        placeholder="Column label"
                        className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-aa-blue"
                      />
                      <select
                        value={col.type || 'text'}
                        onChange={e => onUpdateColumn(ci, { type: e.target.value })}
                        className="px-2 py-1 text-[11px] border border-gray-200 rounded bg-white focus:outline-none focus:border-aa-blue"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="currency">Currency</option>
                        <option value="date">Date</option>
                      </select>
                      <button onClick={() => onRemoveColumn(ci)} className="text-gray-300 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-secondary-text">Min rows</label>
                  <input
                    type="number"
                    min={0}
                    value={field.min_rows || 1}
                    onChange={e => onUpdate({ min_rows: parseInt(e.target.value) || 1 })}
                    className="w-14 px-2 py-0.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-aa-blue"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-secondary-text">Max rows</label>
                  <input
                    type="number"
                    min={1}
                    value={field.max_rows || 20}
                    onChange={e => onUpdate({ max_rows: parseInt(e.target.value) || 20 })}
                    className="w-14 px-2 py-0.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-aa-blue"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Photos config */}
          {isPhotos && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={field.photo_config?.allow_before_after || false}
                  onChange={e => onUpdate({ photo_config: { ...(field.photo_config || {}), allow_before_after: e.target.checked } })}
                  className="w-3 h-3 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                />
                <span className="text-[11px] text-secondary-text">Before/After pairs</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-secondary-text">Max photos:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={field.photo_config?.max_photos || 10}
                  onChange={e => onUpdate({ photo_config: { ...(field.photo_config || {}), max_photos: parseInt(e.target.value) || 10 } })}
                  className="w-14 px-2 py-0.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-aa-blue"
                />
              </div>
            </div>
          )}

          {/* Bullets config */}
          {isBullets && (
            <div className="flex gap-3">
              <div>
                <label className="text-[10px] text-secondary-text">Min items</label>
                <input
                  type="number"
                  min={0}
                  value={field.min_rows || 1}
                  onChange={e => onUpdate({ min_rows: parseInt(e.target.value) || 1 })}
                  className="w-14 px-2 py-0.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-aa-blue"
                />
              </div>
              <div>
                <label className="text-[10px] text-secondary-text">Max items</label>
                <input
                  type="number"
                  min={1}
                  value={field.max_rows || 10}
                  onChange={e => onUpdate({ max_rows: parseInt(e.target.value) || 10 })}
                  className="w-14 px-2 py-0.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-aa-blue"
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={e => onUpdate({ required: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
            />
            <span className="text-xs text-secondary-text">Required</span>
          </label>
        </div>

        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 mt-1">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
