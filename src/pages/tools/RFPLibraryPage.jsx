import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Search, ChevronDown, ChevronUp, Trash2,
  Loader2, XCircle, CheckCircle, Bot, Tag, BarChart3,
  ArrowLeft, Edit3, X, Download, Database, Save, ShieldCheck, Users, Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import { FACT_DEFINITIONS, A_AND_A_DEFAULTS } from '../../utils/rfpFactDefinitions';

const CATEGORIES = [
  'company_overview', 'safety', 'compliance', 'staffing', 'technical',
  'financial', 'references', 'experience', 'transition', 'sustainability', 'other',
];

const CATEGORY_BADGE = {
  company_overview: 'bg-blue-50 text-blue-700',
  safety: 'bg-red-50 text-red-700',
  compliance: 'bg-purple-50 text-purple-700',
  staffing: 'bg-green-50 text-green-700',
  technical: 'bg-cyan-50 text-cyan-700',
  financial: 'bg-amber-50 text-amber-700',
  references: 'bg-indigo-50 text-indigo-700',
  experience: 'bg-orange-50 text-orange-700',
  transition: 'bg-teal-50 text-teal-700',
  sustainability: 'bg-emerald-50 text-emerald-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function RFPLibraryPage() {
  const navigate = useNavigate();
  const { tenantId } = useTenantId();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ question: '', answer: '', category: 'other', tags: '' });
  const [saving, setSaving] = useState(false);

  // Edit
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '', category: '', tags: '' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Expanded
  const [expandedId, setExpandedId] = useState(null);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [projects, setProjects] = useState([]);
  const [importing, setImporting] = useState(false);

  // View tab: 'library' | 'facts'
  const [view, setView] = useState('library');

  // Facts state — flat map { fact_key: { fact_value, source } }
  const [facts, setFacts] = useState({});
  const [factsLoading, setFactsLoading] = useState(false);
  const [factDirty, setFactDirty] = useState({}); // { fact_key: true }
  const [factsSaving, setFactsSaving] = useState(false);
  const [factsExpanded, setFactsExpanded] = useState({ safety_metrics: true });

  useEffect(() => {
    loadEntries();
    loadFacts();
  }, [tenantId]);

  async function loadFacts() {
    setFactsLoading(true);
    const { data, error: err } = await supabase
      .from('tenant_rfp_facts')
      .select('fact_key, fact_value, category, source, notes')
      .eq('tenant_id', tenantId);

    if (err) {
      console.error('[facts] load error:', err.message);
    } else {
      const map = {};
      for (const row of data || []) {
        map[row.fact_key] = { value: row.fact_value || '', category: row.category, source: row.source };
      }
      setFacts(map);
    }
    setFactsLoading(false);
  }

  function setFactValue(factKey, value) {
    setFacts(prev => ({ ...prev, [factKey]: { ...(prev[factKey] || {}), value } }));
    setFactDirty(prev => ({ ...prev, [factKey]: true }));
  }

  // Map definition category → DB category
  const FACT_DB_CATEGORY = {
    safety_metrics: 'safety_metrics',
    policy_flags: 'policy_flags',
    certifications: 'certifications',
    references: 'references',
    company_counts: 'company_counts',
  };

  async function saveFacts() {
    const dirtyKeys = Object.keys(factDirty);
    if (dirtyKeys.length === 0) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(null), 2000);
      return;
    }

    setFactsSaving(true);

    // Build rows to upsert — find which DB category each key belongs to
    const rows = [];
    for (const key of dirtyKeys) {
      let dbCategory = 'other';
      for (const [defCat, def] of Object.entries(FACT_DEFINITIONS)) {
        if (def.fields.some(f => f.key === key)) {
          dbCategory = FACT_DB_CATEGORY[defCat] || 'other';
          break;
        }
      }
      rows.push({
        tenant_id: tenantId,
        fact_key: key,
        fact_value: facts[key]?.value ?? null,
        category: dbCategory,
        source: 'confirmed',
      });
    }

    const { error: upsertErr } = await supabase
      .from('tenant_rfp_facts')
      .upsert(rows, { onConflict: 'tenant_id,fact_key' });

    if (upsertErr) {
      setError(upsertErr.message);
      setTimeout(() => setError(null), 4000);
    } else {
      setFactDirty({});
      setSuccess(`Saved ${rows.length} fact${rows.length > 1 ? 's' : ''}`);
      setTimeout(() => setSuccess(null), 3000);
    }
    setFactsSaving(false);
  }

  async function loadAaDefaults() {
    // Pre-fill any blank fields with A&A defaults — does not overwrite existing values
    setFacts(prev => {
      const next = { ...prev };
      const newDirty = { ...factDirty };
      for (const [key, value] of Object.entries(A_AND_A_DEFAULTS)) {
        if (!next[key]?.value) {
          next[key] = { value, category: 'default', source: 'default' };
          newDirty[key] = true;
        }
      }
      setFactDirty(newDirty);
      return next;
    });
    setSuccess('A&A defaults loaded — review and click Save');
    setTimeout(() => setSuccess(null), 4000);
  }

  const filledFactCount = useMemo(
    () => Object.values(facts).filter(f => f.value && String(f.value).trim()).length,
    [facts]
  );
  const dirtyFactCount = Object.keys(factDirty).length;

  async function loadEntries() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('tenant_rfp_answers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!addForm.question.trim() || !addForm.answer.trim()) {
      setError('Question and answer are required.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertErr } = await supabase
      .from('tenant_rfp_answers')
      .insert({
        tenant_id: tenantId,
        question: addForm.question.trim(),
        answer: addForm.answer.trim(),
        category: addForm.category,
        tags: addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        created_by: user?.id || null,
      });

    if (insertErr) {
      setError(insertErr.message);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess('Q&A pair added');
      setTimeout(() => setSuccess(null), 3000);
      setAddForm({ question: '', answer: '', category: 'other', tags: '' });
      setShowAdd(false);
      loadEntries();
    }
    setSaving(false);
  }

  async function handleSaveEdit(id) {
    if (!editForm.question.trim() || !editForm.answer.trim()) return;

    const { error: updateErr } = await supabase
      .from('tenant_rfp_answers')
      .update({
        question: editForm.question.trim(),
        answer: editForm.answer.trim(),
        category: editForm.category,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      .eq('id', id);

    if (updateErr) {
      setError(updateErr.message);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess('Q&A pair updated');
      setTimeout(() => setSuccess(null), 3000);
      setEditId(null);
      loadEntries();
    }
  }

  async function handleToggleActive(id, currentActive) {
    const { error: updateErr } = await supabase
      .from('tenant_rfp_answers')
      .update({ is_active: !currentActive })
      .eq('id', id);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, is_active: !currentActive } : e));
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    const { error: deleteErr } = await supabase
      .from('tenant_rfp_answers')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      setError(deleteErr.message);
    } else {
      setEntries(prev => prev.filter(e => e.id !== id));
      setSuccess('Q&A pair deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
    setDeleting(null);
    setConfirmDelete(null);
  }

  async function openImportModal() {
    setShowImport(true);
    const { data } = await supabase
      .from('tenant_rfp_projects')
      .select('id, name, status, approved_count')
      .eq('tenant_id', tenantId)
      .in('status', ['submitted', 'won'])
      .order('created_at', { ascending: false });
    setProjects(data || []);
  }

  async function handleImportFromProject(projectId) {
    setImporting(true);
    const { data: items } = await supabase
      .from('tenant_rfp_items')
      .select('question_text, final_response, category, section')
      .eq('rfp_project_id', projectId)
      .eq('status', 'approved')
      .not('final_response', 'is', null);

    if (!items?.length) {
      setError('No approved responses found in this project.');
      setTimeout(() => setError(null), 3000);
      setImporting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const inserts = items.map(item => ({
      tenant_id: tenantId,
      question: item.question_text,
      answer: item.final_response,
      category: item.category || 'other',
      tags: item.section ? [item.section] : [],
      created_by: user?.id || null,
    }));

    const { error: insertErr } = await supabase
      .from('tenant_rfp_answers')
      .insert(inserts);

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setSuccess(`Imported ${inserts.length} Q&A pair${inserts.length > 1 ? 's' : ''}`);
      setTimeout(() => setSuccess(null), 3000);
      setShowImport(false);
      loadEntries();
    }
    setImporting(false);
  }

  // Filtered and searched entries
  const filtered = useMemo(() => {
    let result = entries;

    if (showActiveOnly) {
      result = result.filter(e => e.is_active);
    }

    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.question.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [entries, showActiveOnly, filterCategory, searchQuery]);

  // Stats
  const totalPairs = entries.length;
  const activePairs = entries.filter(e => e.is_active).length;
  const categorySet = new Set(entries.map(e => e.category));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/portal/tools/rfp-response')}
            className="p-1.5 text-secondary-text hover:text-dark-text transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 bg-aa-blue/10 rounded-lg">
            <BookOpen size={20} className="text-aa-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-dark-text">Q&A Library</h1>
            <p className="text-sm text-secondary-text">
              Curated question-answer pairs that power RFP response matching
            </p>
          </div>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <Bot size={16} />
          Ask RFP Agent
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setView('library')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            view === 'library'
              ? 'text-aa-blue border-aa-blue'
              : 'text-secondary-text border-transparent hover:text-dark-text'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={14} />
            Q&A Library ({totalPairs})
          </span>
        </button>
        <button
          onClick={() => setView('facts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            view === 'facts'
              ? 'text-aa-blue border-aa-blue'
              : 'text-secondary-text border-transparent hover:text-dark-text'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Database size={14} />
            RFP Facts ({filledFactCount})
            {dirtyFactCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-700">
                {dirtyFactCount} unsaved
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Stats — only shown in library view */}
      {view === 'library' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Total Pairs</div>
            <div className="text-2xl font-semibold text-dark-text mt-1">{totalPairs}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Active Pairs</div>
            <div className="text-2xl font-semibold text-dark-text mt-1">{activePairs}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Categories</div>
            <div className="text-2xl font-semibold text-dark-text mt-1">{categorySet.size}</div>
          </div>
        </div>
      )}

      {/* Facts Panel */}
      {view === 'facts' && (
        <div className="space-y-4">
          {/* Facts header / actions */}
          <div className="flex items-start justify-between gap-3 bg-sky-50 border border-sky-200 rounded-lg p-4">
            <div className="flex-1">
              <div className="text-sm font-medium text-dark-text">RFP Facts</div>
              <p className="text-xs text-secondary-text mt-1 leading-relaxed">
                Verified company facts the agent uses on every RFP question. Keep these current —
                outdated metrics or missing references force the agent to mark items as "needs data".
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {filledFactCount === 0 && (
                <button
                  onClick={loadAaDefaults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-aa-blue bg-white border border-aa-blue/30 rounded-md hover:bg-aa-blue/5 transition-colors"
                >
                  <Download size={12} />
                  Load A&A Defaults
                </button>
              )}
              <button
                onClick={saveFacts}
                disabled={factsSaving || dirtyFactCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-aa-blue rounded-md hover:bg-aa-blue/90 disabled:opacity-40 transition-colors"
              >
                {factsSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {factsSaving ? 'Saving...' : `Save${dirtyFactCount > 0 ? ` (${dirtyFactCount})` : ''}`}
              </button>
            </div>
          </div>

          {factsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-aa-blue animate-spin" />
            </div>
          ) : (
            Object.entries(FACT_DEFINITIONS).map(([sectionKey, section]) => {
              const isOpen = factsExpanded[sectionKey] !== false;
              const sectionFilled = section.fields.filter(f => facts[f.key]?.value && String(facts[f.key].value).trim()).length;
              const Icon = sectionKey === 'safety_metrics' ? ShieldCheck
                : sectionKey === 'references' ? Phone
                : sectionKey === 'company_counts' ? Users
                : Database;

              return (
                <div key={sectionKey} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setFactsExpanded(prev => ({ ...prev, [sectionKey]: !isOpen }))}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Icon size={16} className="text-aa-blue shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-dark-text">{section.label}</div>
                      <div className="text-xs text-secondary-text">{section.description}</div>
                    </div>
                    <span className="text-xs text-secondary-text shrink-0">
                      {sectionFilled}/{section.fields.length}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        {section.fields.map(field => {
                          const current = facts[field.key]?.value || '';
                          const isDirty = factDirty[field.key];

                          if (field.input === 'boolean') {
                            const truthy = current === 'true' || current === true;
                            return (
                              <label
                                key={field.key}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                                  truthy ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                                } ${isDirty ? 'ring-1 ring-orange-300' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={truthy}
                                  onChange={e => setFactValue(field.key, e.target.checked ? 'true' : 'false')}
                                  className="rounded"
                                />
                                <span className="text-xs text-dark-text">{field.label}</span>
                              </label>
                            );
                          }

                          if (field.input === 'textarea') {
                            return (
                              <div key={field.key} className="sm:col-span-2">
                                <label className="block text-xs font-medium text-secondary-text mb-1">
                                  {field.label}
                                  {isDirty && <span className="ml-1 text-orange-500">●</span>}
                                </label>
                                <textarea
                                  value={current}
                                  onChange={e => setFactValue(field.key, e.target.value)}
                                  rows={2}
                                  placeholder={field.placeholder}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
                                />
                                {field.help && <div className="text-[10px] text-secondary-text mt-0.5">{field.help}</div>}
                              </div>
                            );
                          }

                          return (
                            <div key={field.key}>
                              <label className="block text-xs font-medium text-secondary-text mb-1">
                                {field.label}
                                {isDirty && <span className="ml-1 text-orange-500">●</span>}
                              </label>
                              <input
                                type={field.input === 'number' ? 'text' : 'text'}
                                inputMode={field.input === 'number' ? 'decimal' : 'text'}
                                value={current}
                                onChange={e => setFactValue(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                              />
                              {field.help && <div className="text-[10px] text-secondary-text mt-0.5">{field.help}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Library View ─────────────────────────────────────────── */}
      {view === 'library' && (
      <>

      {/* Add New + Import */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors"
        >
          <Plus size={16} />
          Add Q&A Pair
        </button>
        <button
          onClick={openImportModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <Download size={16} />
          Import from Project
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-dark-text">New Q&A Pair</h3>

          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Question</label>
            <textarea
              value={addForm.question}
              onChange={e => setAddForm(f => ({ ...f, question: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
              placeholder="What safety certifications does your company hold?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Answer</label>
            <textarea
              value={addForm.answer}
              onChange={e => setAddForm(f => ({ ...f, answer: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
              placeholder="Our company maintains the following safety certifications..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Category</label>
              <select
                value={addForm.category}
                onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={addForm.tags}
                onChange={e => setAddForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                placeholder="safety, OSHA, certifications"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm font-medium text-secondary-text hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
            placeholder="Search questions and answers..."
          />
        </div>
        <button
          onClick={() => setShowActiveOnly(!showActiveOnly)}
          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            showActiveOnly
              ? 'bg-sky-50 text-sky-700 border-sky-200'
              : 'bg-white text-secondary-text border-gray-200 hover:bg-gray-50'
          }`}
        >
          {showActiveOnly ? 'Active Only' : 'Show All'}
        </button>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filterCategory === 'all'
              ? 'bg-sky-100 text-sky-800 border border-sky-300'
              : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
          }`}
        >
          All ({entries.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = entries.filter(e => e.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
                filterCategory === cat
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
              }`}
            >
              {cat.replace(/_/g, ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Entries list */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-secondary-text">
          {entries.length === 0 ? 'No Q&A pairs yet. Add your first one above.' : 'No Q&A pairs match your filters.'}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(entry => {
            const isExpanded = expandedId === entry.id;
            const isEditing = editId === entry.id;
            const catCls = CATEGORY_BADGE[entry.category] || CATEGORY_BADGE.other;

            return (
              <div key={entry.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header row */}
                <div
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => { setExpandedId(isExpanded ? null : entry.id); setEditId(null); }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-dark-text line-clamp-2">{entry.question}</div>
                    <div className="text-xs text-secondary-text mt-1 line-clamp-1">{entry.answer}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded capitalize ${catCls}`}>
                        {entry.category.replace(/_/g, ' ')}
                      </span>
                      {(entry.tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                      {!entry.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-50 text-yellow-700">Inactive</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs text-secondary-text">
                    <div className="flex items-center gap-1" title="Uses / Wins">
                      <BarChart3 size={12} />
                      {entry.use_count || 0} / {entry.win_count || 0}W
                    </div>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-secondary-text mb-1">Question</label>
                          <textarea
                            value={editForm.question}
                            onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary-text mb-1">Answer</label>
                          <textarea
                            value={editForm.answer}
                            onChange={e => setEditForm(f => ({ ...f, answer: e.target.value }))}
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-secondary-text mb-1">Category</label>
                            <select
                              value={editForm.category}
                              onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
                            >
                              {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-secondary-text mb-1">Tags</label>
                            <input
                              type="text"
                              value={editForm.tags}
                              onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="px-3 py-1.5 text-sm font-medium text-secondary-text hover:text-dark-text transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-xs font-medium text-secondary-text mb-1">Full Answer</div>
                          <div className="text-sm text-dark-text whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                            {entry.answer}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-secondary-text">
                          <span>Uses: {entry.use_count || 0}</span>
                          <span>Wins: {entry.win_count || 0}</span>
                          <span>Losses: {entry.loss_count || 0}</span>
                          <span>Created: {new Date(entry.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditId(entry.id);
                              setEditForm({
                                question: entry.question,
                                answer: entry.answer,
                                category: entry.category,
                                tags: (entry.tags || []).join(', '),
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-md hover:bg-aa-blue/10 transition-colors"
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(entry.id, entry.is_active); }}
                            className="px-2.5 py-1.5 text-xs font-medium text-secondary-text border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            {entry.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {confirmDelete === entry.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-red-600">Delete?</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                disabled={deleting === entry.id}
                                className="px-2 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                {deleting === entry.id ? 'Deleting...' : 'Yes'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                                className="px-2 py-1 text-xs text-secondary-text hover:text-dark-text transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(entry.id); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </>
      )}

      {/* Import Modal */}
      {showImport && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => !importing && setShowImport(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-dark-text">Import from Project</h2>
                <button onClick={() => setShowImport(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-secondary-text mb-4">
                Select a completed RFP project to import its approved responses as Q&A pairs.
              </p>

              {projects.length === 0 ? (
                <p className="text-sm text-secondary-text italic py-4 text-center">
                  No completed or won projects found.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleImportFromProject(p.id)}
                      disabled={importing}
                      className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <div className="text-sm font-medium text-dark-text">{p.name}</div>
                      <div className="text-xs text-secondary-text mt-0.5">
                        {p.approved_count || 0} approved responses · Status: {p.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {importing && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 size={16} className="text-aa-blue animate-spin" />
                  <span className="text-sm text-secondary-text">Importing...</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Agent Chat */}
      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="rfp_builder"
        agentName="RFP Response Agent"
        context="RFP responses, Q&A library management, bid strategy"
      />
    </div>
  );
}
