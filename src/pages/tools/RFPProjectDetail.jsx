import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, Loader2, XCircle, CheckCircle, ChevronDown, ChevronUp,
  FileSearch, Plus, Sparkles, Download, Check, AlertCircle, BarChart3,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import { callAgent } from '../../agents/api';
import AgentActionButton from '../../components/shared/AgentActionButton';
import AgentChatPanel from '../../components/shared/AgentChatPanel';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
  review: { label: 'Review', cls: 'bg-purple-50 text-purple-700' },
  submitted: { label: 'Submitted', cls: 'bg-cyan-50 text-cyan-700' },
  won: { label: 'Won', cls: 'bg-green-50 text-green-700' },
  lost: { label: 'Lost', cls: 'bg-red-50 text-red-700' },
};

const ITEM_STATUS_BADGE = {
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  needs_data: { label: 'Needs Data', cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  drafted: { label: 'Drafted', cls: 'bg-blue-50 text-blue-700' },
  assigned: { label: 'Assigned', cls: 'bg-orange-50 text-orange-700' },
  reviewed: { label: 'Reviewed', cls: 'bg-purple-50 text-purple-700' },
  approved: { label: 'Approved', cls: 'bg-green-50 text-green-700' },
};

const PROJECT_STATUSES = ['draft', 'in_progress', 'review', 'submitted', 'won', 'lost'];

function ConfidenceBadge({ confidence }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const cls = pct >= 70 ? 'bg-green-50 text-green-700' :
              pct >= 40 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700';
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${cls}`}>
      {pct}% match
    </span>
  );
}

export default function RFPProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { tenantId } = useTenantId();

  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Item state
  const [expandedItem, setExpandedItem] = useState(null);
  const [editingDraft, setEditingDraft] = useState({});
  const [editingFinal, setEditingFinal] = useState({});

  // Agent actions
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [generatingItem, setGeneratingItem] = useState(null);

  // Add item
  const [showAddItem, setShowAddItem] = useState(false);
  const [addForm, setAddForm] = useState({ question_text: '', section: '', category: 'other' });

  // Chat
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId, tenantId]);

  async function loadProject() {
    setLoading(true);
    const [projectRes, itemsRes] = await Promise.all([
      supabase
        .from('tenant_rfp_projects')
        .select('*')
        .eq('id', projectId)
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('tenant_rfp_items')
        .select('*, matched_answer:tenant_rfp_answers(id, question, answer, category, win_count)')
        .eq('rfp_project_id', projectId)
        .eq('tenant_id', tenantId)
        .order('item_number'),
    ]);

    if (projectRes.error) {
      setError('Project not found.');
    } else {
      setProject(projectRes.data);
    }

    setItems(itemsRes.data || []);
    setLoading(false);
  }

  // Sync project counts
  const syncCounts = useCallback(async (updatedItems) => {
    const itemCount = updatedItems.length;
    const approvedCount = updatedItems.filter(i => i.status === 'approved').length;
    await supabase
      .from('tenant_rfp_projects')
      .update({ item_count: itemCount, approved_count: approvedCount })
      .eq('id', projectId);
    setProject(prev => prev ? { ...prev, item_count: itemCount, approved_count: approvedCount } : prev);
  }, [projectId]);

  // ── Agent Actions ──

  async function handleParseRfp() {
    if (!project?.source_document_id) {
      setError('No RFP document uploaded. Upload one first.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    setParsing(true);
    setError(null);

    try {
      // Fetch the document text
      const { data: doc } = await supabase
        .from('tenant_documents')
        .select('extracted_text')
        .eq('id', project.source_document_id)
        .single();

      if (!doc?.extracted_text) {
        throw new Error('No extracted text found in the uploaded document.');
      }

      const response = await callAgent('rfp_builder', 'parseRfp', {
        documentText: doc.extracted_text,
      });

      // Parse JSON from response
      let parsed;
      try {
        const jsonStr = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error('Agent returned invalid JSON. Please try again.');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No questions extracted from the document.');
      }

      // Insert items
      const { data: { user } } = await supabase.auth.getUser();
      const inserts = parsed.map((item, idx) => ({
        tenant_id: tenantId,
        rfp_project_id: projectId,
        item_number: item.item_number || idx + 1,
        question_text: item.question_text,
        section: item.section || null,
        category: item.category || 'other',
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('tenant_rfp_items')
        .insert(inserts)
        .select('*, matched_answer:tenant_rfp_answers(id, question, answer, category, win_count)');

      if (insertErr) throw insertErr;

      setItems(inserted || []);
      await syncCounts(inserted || []);
      setSuccess(`Extracted ${inserted.length} questions from the RFP`);
      setTimeout(() => setSuccess(null), 4000);

      // Move project to in_progress if still draft
      if (project.status === 'draft') {
        await supabase
          .from('tenant_rfp_projects')
          .update({ status: 'in_progress' })
          .eq('id', projectId);
        setProject(prev => prev ? { ...prev, status: 'in_progress' } : prev);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 6000);
    }
    setParsing(false);
  }

  async function handleAutoMatch() {
    if (items.length === 0) {
      setError('No items to match. Parse the RFP first.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setMatching(true);
    setError(null);

    try {
      // Fetch Q&A library
      const { data: qaLibrary } = await supabase
        .from('tenant_rfp_answers')
        .select('id, question, answer, category, tags, win_count')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (!qaLibrary?.length) {
        setError('Q&A library is empty. Add entries first.');
        setTimeout(() => setError(null), 4000);
        setMatching(false);
        return;
      }

      const pendingItems = items.filter(i => !i.matched_answer_id);
      if (pendingItems.length === 0) {
        setSuccess('All items already have matches.');
        setTimeout(() => setSuccess(null), 3000);
        setMatching(false);
        return;
      }

      const questions = pendingItems.map(i => ({
        item_number: i.item_number,
        question_text: i.question_text,
        section: i.section,
        category: i.category,
      }));

      const response = await callAgent('rfp_builder', 'matchAnswers', {
        questions,
        qaLibrary: qaLibrary.map(q => ({ id: q.id, question: q.question, answer: q.answer, category: q.category, tags: q.tags })),
      });

      let matches;
      try {
        const jsonStr = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        matches = JSON.parse(jsonStr);
      } catch {
        throw new Error('Agent returned invalid JSON for matching. Please try again.');
      }

      // Update items with matches
      for (const match of matches) {
        if (match.confidence >= 0.4 && match.matched_answer_id) {
          await supabase
            .from('tenant_rfp_items')
            .update({
              matched_answer_id: match.matched_answer_id,
              match_confidence: match.confidence,
              draft_response: match.suggested_response || null,
              status: match.suggested_response ? 'drafted' : 'pending',
            })
            .eq('rfp_project_id', projectId)
            .eq('item_number', match.item_number);
        }
      }

      await loadProject();
      const matchCount = matches.filter(m => m.confidence >= 0.4 && m.matched_answer_id).length;
      setSuccess(`Matched ${matchCount} of ${pendingItems.length} items`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 6000);
    }
    setMatching(false);
  }

  async function handleGenerateDraft(item) {
    setGeneratingItem(item.id);
    setError(null);

    try {
      const response = await callAgent('rfp_builder', 'generateDraft', {
        question: item.question_text,
        section: item.section,
        category: item.category,
        matchedAnswer: item.matched_answer ? {
          question: item.matched_answer.question,
          answer: item.matched_answer.answer,
          confidence: item.match_confidence,
        } : null,
      });

      await supabase
        .from('tenant_rfp_items')
        .update({ draft_response: response, status: 'drafted' })
        .eq('id', item.id);

      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, draft_response: response, status: 'drafted' } : i
      ));
      setEditingDraft(prev => ({ ...prev, [item.id]: response }));
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
    setGeneratingItem(null);
  }

  // ── Item Management ──

  async function handleAddItem() {
    if (!addForm.question_text.trim()) return;

    const nextNum = items.length > 0 ? Math.max(...items.map(i => i.item_number)) + 1 : 1;

    const { data: inserted, error: insertErr } = await supabase
      .from('tenant_rfp_items')
      .insert({
        tenant_id: tenantId,
        rfp_project_id: projectId,
        item_number: nextNum,
        question_text: addForm.question_text.trim(),
        section: addForm.section.trim() || null,
        category: addForm.category,
      })
      .select('*, matched_answer:tenant_rfp_answers(id, question, answer, category, win_count)')
      .single();

    if (insertErr) {
      setError(insertErr.message);
    } else {
      const updatedItems = [...items, inserted];
      setItems(updatedItems);
      await syncCounts(updatedItems);
      setAddForm({ question_text: '', section: '', category: 'other' });
      setShowAddItem(false);
    }
  }

  async function handleUpdateItemStatus(itemId, newStatus) {
    const { data: { user } } = await supabase.auth.getUser();
    const updates = { status: newStatus };
    if (newStatus === 'reviewed' || newStatus === 'approved') {
      updates.reviewed_by = user?.id || null;
      updates.reviewed_at = new Date().toISOString();
    }

    await supabase
      .from('tenant_rfp_items')
      .update(updates)
      .eq('id', itemId);

    const updatedItems = items.map(i => i.id === itemId ? { ...i, ...updates } : i);
    setItems(updatedItems);
    await syncCounts(updatedItems);
  }

  async function handleSaveDraft(itemId) {
    const text = editingDraft[itemId];
    if (text == null) return;

    await supabase
      .from('tenant_rfp_items')
      .update({ draft_response: text })
      .eq('id', itemId);

    setItems(prev => prev.map(i => i.id === itemId ? { ...i, draft_response: text } : i));
    setSuccess('Draft saved');
    setTimeout(() => setSuccess(null), 2000);
  }

  async function handleSaveFinal(itemId) {
    const text = editingFinal[itemId];
    if (text == null) return;

    await supabase
      .from('tenant_rfp_items')
      .update({ final_response: text })
      .eq('id', itemId);

    setItems(prev => prev.map(i => i.id === itemId ? { ...i, final_response: text } : i));
    setSuccess('Final response saved');
    setTimeout(() => setSuccess(null), 2000);
  }

  // ── Project Status ──

  async function handleStatusChange(newStatus) {
    const oldStatus = project.status;

    await supabase
      .from('tenant_rfp_projects')
      .update({ status: newStatus })
      .eq('id', projectId);

    setProject(prev => prev ? { ...prev, status: newStatus } : prev);

    // Win/loss tracking — update Q&A library entries
    if ((newStatus === 'won' || newStatus === 'lost') && oldStatus !== newStatus) {
      const matchedItems = items.filter(i => i.matched_answer_id);
      const answerIds = [...new Set(matchedItems.map(i => i.matched_answer_id))];

      if (answerIds.length > 0) {
        const field = newStatus === 'won' ? 'win_count' : 'loss_count';
        for (const answerId of answerIds) {
          const { data: current } = await supabase
            .from('tenant_rfp_answers')
            .select(field)
            .eq('id', answerId)
            .single();

          if (current) {
            await supabase
              .from('tenant_rfp_answers')
              .update({ [field]: (current[field] || 0) + 1 })
              .eq('id', answerId);
          }
        }
      }
    }
  }

  // ── Generate Response Document ──

  const [generating, setGenerating] = useState(false);

  async function handleGenerateDoc() {
    setGenerating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Session expired. Please refresh and sign in again.');
        return;
      }

      const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
      const response = await fetch(`${backendUrl}/api/rfp/${project.id}/generate-doc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Generation failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_response.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Response document generated successfully.');
    } catch (e) {
      console.error('[generate-doc] error:', e);
      setError(e.message || 'Failed to generate response document.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Stats ──

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, needs_data: 0, drafted: 0, assigned: 0, reviewed: 0, approved: 0 };
    items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return counts;
  }, [items]);

  const completionPct = items.length > 0
    ? Math.round((statusCounts.approved / items.length) * 100)
    : 0;
  const needsDataPct = items.length > 0
    ? Math.round((statusCounts.needs_data / items.length) * 100)
    : 0;
  const pendingPct = Math.max(0, 100 - completionPct - needsDataPct);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-secondary-text">Project not found.</p>
        <button
          onClick={() => navigate('/portal/tools/rfp-response')}
          className="mt-3 text-sm text-aa-blue hover:underline"
        >
          Back to projects
        </button>
      </div>
    );
  }

  const projectStatus = STATUS_BADGE[project.status] || STATUS_BADGE.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/portal/tools/rfp-response')}
            className="p-1.5 mt-0.5 text-secondary-text hover:text-dark-text transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-light text-dark-text">{project.name}</h1>
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${projectStatus.cls}`}>
                {projectStatus.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-secondary-text">
              {project.issuing_organization && <span>{project.issuing_organization}</span>}
              {project.due_date && (
                <span className={new Date(project.due_date) < new Date(Date.now() + 7 * 86400000) ? 'text-red-600 font-medium' : ''}>
                  Due: {new Date(project.due_date).toLocaleDateString()}
                </span>
              )}
              <span>{items.length} items</span>
              <span>{completionPct}% approved</span>
              {statusCounts.needs_data > 0 && (
                <span className="text-orange-600 font-medium">{statusCounts.needs_data} need data</span>
              )}
            </div>
            {/* Progress bar — three segments: approved / needs_data / pending */}
            {items.length > 0 && (
              <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2 flex">
                <div
                  className="h-full bg-aa-blue transition-all"
                  style={{ width: `${completionPct}%` }}
                  title={`${statusCounts.approved} approved`}
                />
                <div
                  className="h-full bg-orange-400 transition-all"
                  style={{ width: `${needsDataPct}%` }}
                  title={`${statusCounts.needs_data} need data`}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={e => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
          >
            {PROJECT_STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <button
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
          >
            <Bot size={14} />
            Ask Agent
          </button>
        </div>
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

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Items list (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Agent action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <AgentActionButton
              label={parsing ? 'Parsing...' : 'Parse RFP'}
              variant="primary"
              onClick={handleParseRfp}
            />
            <AgentActionButton
              label={matching ? 'Matching...' : 'Auto-Match All'}
              onClick={handleAutoMatch}
            />
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-secondary-text border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>

          {/* Add item form */}
          {showAddItem && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Question</label>
                <textarea
                  value={addForm.question_text}
                  onChange={e => setAddForm(f => ({ ...f, question_text: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
                  placeholder="Enter the RFP question or requirement..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Section</label>
                  <input
                    type="text"
                    value={addForm.section}
                    onChange={e => setAddForm(f => ({ ...f, section: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                    placeholder="e.g., Technical Requirements"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Category</label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
                  >
                    {['company_overview','safety','compliance','staffing','technical','financial','references','experience','transition','other'].map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddItem(false)}
                  className="px-3 py-1.5 text-sm font-medium text-secondary-text hover:text-dark-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <FileSearch size={32} className="text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-secondary-text">No items yet.</div>
              <div className="text-xs text-secondary-text mt-1">
                Upload an RFP document and click "Parse RFP" to extract questions, or add items manually.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const isExpanded = expandedItem === item.id;
                const itemStatus = ITEM_STATUS_BADGE[item.status] || ITEM_STATUS_BADGE.pending;
                const isGenerating = generatingItem === item.id;

                return (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Item header */}
                    <div
                      className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50/50"
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    >
                      <span className="text-xs font-mono text-secondary-text mt-0.5 shrink-0 w-6 text-right">
                        {item.item_number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-dark-text line-clamp-2">{item.question_text}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${itemStatus.cls}`}>
                            {itemStatus.label}
                          </span>
                          {item.section && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                              {item.section}
                            </span>
                          )}
                          <ConfidenceBadge confidence={item.match_confidence} />
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                        {/* Full question */}
                        <div>
                          <div className="text-xs font-medium text-secondary-text mb-1">Question</div>
                          <div className="text-sm text-dark-text bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                            {item.question_text}
                          </div>
                        </div>

                        {/* Matched answer */}
                        {item.matched_answer && (
                          <div>
                            <div className="text-xs font-medium text-secondary-text mb-1 flex items-center gap-2">
                              Matched Q&A
                              <ConfidenceBadge confidence={item.match_confidence} />
                              {item.matched_answer.win_count > 0 && (
                                <span className="text-[10px] text-green-600">{item.matched_answer.win_count} wins</span>
                              )}
                            </div>
                            <div className="text-xs text-secondary-text bg-sky-50 rounded-lg p-3">
                              <div className="font-medium mb-1">Q: {item.matched_answer.question}</div>
                              <div className="text-gray-700 whitespace-pre-wrap">{item.matched_answer.answer}</div>
                            </div>
                          </div>
                        )}

                        {/* Draft response */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-secondary-text">Draft Response</div>
                            <div className="flex items-center gap-2">
                              <AgentActionButton
                                label={isGenerating ? 'Generating...' : 'Generate Draft'}
                                variant="ghost"
                                onClick={() => handleGenerateDraft(item)}
                              />
                              {editingDraft[item.id] !== undefined && editingDraft[item.id] !== item.draft_response && (
                                <button
                                  onClick={() => handleSaveDraft(item.id)}
                                  className="text-xs text-aa-blue hover:underline"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          </div>
                          <textarea
                            value={editingDraft[item.id] ?? item.draft_response ?? ''}
                            onChange={e => setEditingDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
                            placeholder="Draft response will appear here after generation..."
                          />
                        </div>

                        {/* Final response */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-medium text-secondary-text">Final Response</div>
                            {editingFinal[item.id] !== undefined && editingFinal[item.id] !== item.final_response && (
                              <button
                                onClick={() => handleSaveFinal(item.id)}
                                className="text-xs text-aa-blue hover:underline"
                              >
                                Save
                              </button>
                            )}
                          </div>
                          <textarea
                            value={editingFinal[item.id] ?? item.final_response ?? ''}
                            onChange={e => setEditingFinal(prev => ({ ...prev, [item.id]: e.target.value }))}
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
                            placeholder="Copy the draft here and edit for final submission..."
                          />
                        </div>

                        {/* Needs-data warning */}
                        {item.status === 'needs_data' && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-xs text-orange-800">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">This item needs data before it can be answered.</div>
                              <div className="mt-0.5 text-orange-700">
                                The agent could not draft a response — required information is missing from the RFP Facts panel or Q&A library. Add the missing data, then regenerate.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status progression */}
                        <div className="flex items-center gap-2 pt-1">
                          {item.status === 'pending' && item.draft_response && (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'drafted')}
                              className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              Mark Drafted
                            </button>
                          )}
                          {(item.status === 'drafted' || item.status === 'assigned') && (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'reviewed')}
                              className="px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                            >
                              Mark Reviewed
                            </button>
                          )}
                          {item.status === 'reviewed' && (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'approved')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                          )}
                          {item.status === 'needs_data' && (
                            <button
                              disabled
                              title="Fill in the missing data, then regenerate this item"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed"
                            >
                              <Check size={12} />
                              Approve (blocked)
                            </button>
                          )}
                          {item.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle size={12} />
                              Approved
                            </span>
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

        {/* Right: Context panel (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Project summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-dark-text">Project Summary</h3>

            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => {
                if (count === 0) return null;
                const badge = ITEM_STATUS_BADGE[status];
                const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-aa-blue rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-secondary-text w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary-text">Completion</span>
                  <span className="font-medium text-dark-text">{completionPct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Selected item detail */}
          {expandedItem && (() => {
            const item = items.find(i => i.id === expandedItem);
            if (!item) return null;
            return (
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-dark-text">Item #{item.item_number}</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-secondary-text">Section:</span>{' '}
                    <span className="text-dark-text">{item.section || '—'}</span>
                  </div>
                  <div>
                    <span className="text-secondary-text">Category:</span>{' '}
                    <span className="text-dark-text capitalize">{(item.category || 'other').replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-secondary-text">Match:</span>{' '}
                    {item.match_confidence != null ? (
                      <ConfidenceBadge confidence={item.match_confidence} />
                    ) : (
                      <span className="text-dark-text">No match</span>
                    )}
                  </div>
                  <div>
                    <span className="text-secondary-text">Status:</span>{' '}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${(ITEM_STATUS_BADGE[item.status] || ITEM_STATUS_BADGE.pending).cls}`}>
                      {(ITEM_STATUS_BADGE[item.status] || ITEM_STATUS_BADGE.pending).label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Generate Response Document */}
          {items.some(i => i.final_response || i.draft_response) && (
            <button
              onClick={handleGenerateDoc}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Generate Response Doc
                </>
              )}
            </button>
          )}

          {/* Quick stats */}
          {items.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-dark-text mb-3">Categories</h3>
              <div className="space-y-1.5">
                {Object.entries(
                  items.reduce((acc, i) => { acc[i.category || 'other'] = (acc[i.category || 'other'] || 0) + 1; return acc; }, {})
                ).sort(([,a], [,b]) => b - a).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-secondary-text capitalize">{cat.replace(/_/g, ' ')}</span>
                    <span className="text-dark-text font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Chat */}
      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="rfp_builder"
        agentName="RFP Response Agent"
        context="RFP response drafting, Q&A matching, bid strategy"
        systemPromptSuffix={`Current project: "${project.name}"${project.issuing_organization ? ` for ${project.issuing_organization}` : ''}. ${items.length} items, ${statusCounts.approved} approved, ${statusCounts.pending} pending.`}
      />
    </div>
  );
}
