import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Loader2, Upload, MessageSquareText, XCircle, CheckCircle,
  Clock, CheckCheck, XOctagon, FileText, ChevronDown, ChevronUp,
  Check, X, GitBranch,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildDocumentPath, formatFileSize } from '../../utils/storagePaths';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import { useUser } from '../../contexts/UserContext';

const STATUS_BADGE = {
  pending: { label: 'Pending', className: 'bg-orange-50 text-orange-700', icon: Clock },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700', icon: CheckCheck },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600', icon: XOctagon },
};

export default function AgentInstructionsPage() {
  const { tenantId } = useTenantId();
  const { agents } = useTenantPortal();
  const { currentUser, isSuperAdmin } = useUser();

  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Form state
  const [form, setForm] = useState({ agentKey: '', text: '' });
  const [file, setFile] = useState(null);

  // Review state
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewMode, setReviewMode] = useState(null); // 'approve' | 'reject'
  const [reviewNote, setReviewNote] = useState('');
  const [propagateAgents, setPropagateAgents] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadInstructions(); }, []);

  async function loadInstructions() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('agent_instructions')
      .select('*, profiles:created_by(full_name), reviewer:reviewed_by(full_name), propagated_from')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setInstructions(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.agentKey || !form.text.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let fileFields = {};
      if (file) {
        // Extract text from file
        const { extractText } = await import('../../utils/docExtractor.js');
        const result = await extractText(file);
        const fileType = file.name.split('.').pop().toLowerCase();

        const storagePath = buildDocumentPath(tenantId, 'instructions', file.name);
        const { error: uploadErr } = await supabase.storage
          .from('tenant-documents')
          .upload(storagePath, file);

        if (uploadErr) throw uploadErr;

        fileFields = {
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          storage_path: storagePath,
          extracted_text: result.text || null,
        };
      }

      // Admins auto-approve their own instructions; regular users need review
      const autoApprove = isSuperAdmin;
      const { error: insertErr } = await supabase
        .from('agent_instructions')
        .insert({
          tenant_id: tenantId,
          agent_key: form.agentKey,
          instruction_text: form.text.trim(),
          source: autoApprove ? 'platform' : 'tenant',
          status: autoApprove ? 'approved' : 'pending',
          created_by: currentUser.id,
          ...(autoApprove ? { reviewed_by: currentUser.id, reviewed_at: new Date().toISOString() } : {}),
          ...fileFields,
        });

      if (insertErr) throw insertErr;

      setForm({ agentKey: '', text: '' });
      setFile(null);
      setSuccess(autoApprove ? 'Instruction added and approved' : 'Instruction submitted for review');
      setTimeout(() => setSuccess(null), 4000);
      loadInstructions();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
    setSubmitting(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const name = dropped.name.toLowerCase();
      if (name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt')) {
        setFile(dropped);
      } else {
        setError('Only PDF, DOCX, and TXT files are supported.');
        setTimeout(() => setError(null), 4000);
      }
    }
  }

  // Open review panel for an instruction
  function openReview(instrId, mode) {
    if (reviewingId === instrId && reviewMode === mode) {
      // Toggle off
      closeReview();
      return;
    }
    setReviewingId(instrId);
    setReviewMode(mode);
    setReviewNote('');
    setPropagateAgents([]);
  }

  function closeReview() {
    setReviewingId(null);
    setReviewMode(null);
    setReviewNote('');
    setPropagateAgents([]);
  }

  function togglePropagateAgent(agentKey) {
    setPropagateAgents(prev =>
      prev.includes(agentKey)
        ? prev.filter(k => k !== agentKey)
        : [...prev, agentKey]
    );
  }

  async function handleApprove(instr) {
    setActionLoading(instr.id);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Approve the original instruction
      const { error: updateErr } = await supabase
        .from('agent_instructions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote.trim() || null,
        })
        .eq('id', instr.id);

      if (updateErr) throw updateErr;

      // 2. Create propagated copies for selected agents
      if (propagateAgents.length > 0) {
        const copies = propagateAgents.map(agentKey => ({
          tenant_id: instr.tenant_id,
          agent_key: agentKey,
          instruction_text: instr.instruction_text,
          file_name: instr.file_name || null,
          file_type: instr.file_type || null,
          file_size: instr.file_size || null,
          storage_path: instr.storage_path || null,
          extracted_text: instr.extracted_text || null,
          source: instr.source,
          created_by: instr.created_by,
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote.trim() || null,
          propagated_from: instr.id,
        }));

        const { error: insertErr } = await supabase
          .from('agent_instructions')
          .insert(copies);

        if (insertErr) throw insertErr;
      }

      closeReview();
      const count = propagateAgents.length;
      setSuccess(count > 0
        ? `Approved and propagated to ${count} other agent${count > 1 ? 's' : ''}`
        : 'Instruction approved'
      );
      setTimeout(() => setSuccess(null), 4000);
      loadInstructions();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
    setActionLoading(null);
  }

  async function handleReject(instrId) {
    setActionLoading(instrId);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateErr } = await supabase
        .from('agent_instructions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote.trim() || null,
        })
        .eq('id', instrId);

      if (updateErr) throw updateErr;

      closeReview();
      setSuccess('Instruction rejected');
      setTimeout(() => setSuccess(null), 4000);
      loadInstructions();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
    setActionLoading(null);
  }

  // Filtering
  const filtered = useMemo(() => {
    let list = instructions;
    if (filterAgent !== 'all') list = list.filter(i => i.agent_key === filterAgent);
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    return list;
  }, [instructions, filterAgent, filterStatus]);

  // Metrics
  const counts = useMemo(() => {
    const c = { total: instructions.length, pending: 0, approved: 0, rejected: 0 };
    instructions.forEach(i => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [instructions]);

  // Agent name lookup
  const agentName = (key) => {
    const a = agents.find(a => a.agent_key === key);
    return a?.name || key;
  };

  // Unique agent keys in instructions
  const usedAgentKeys = useMemo(() => {
    const keys = new Set(instructions.map(i => i.agent_key));
    return [...keys].sort();
  }, [instructions]);

  // Source instruction name lookup for propagated_from
  const sourceInstrAgent = (propagatedFromId) => {
    if (!propagatedFromId) return null;
    const source = instructions.find(i => i.id === propagatedFromId);
    return source ? agentName(source.agent_key) : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-dark-text">Agent Instructions</h1>
        <p className="text-sm text-secondary-text mt-1">
          Submit feedback and instructions to your AI agents. All submissions require admin approval before taking effect.
        </p>
      </div>

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

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Total</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{counts.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-orange-600 uppercase tracking-wider">Pending</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{counts.pending}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wider">Approved</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{counts.approved}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wider">Rejected</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{counts.rejected}</div>
        </div>
      </div>

      {/* New instruction form */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-dark-text">Submit New Instruction</h3>

        <div className="flex gap-3">
          <select
            value={form.agentKey}
            onChange={(e) => setForm(f => ({ ...f, agentKey: e.target.value }))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
          >
            <option value="">Select agent...</option>
            {agents.map(a => (
              <option key={a.agent_key} value={a.agent_key}>{a.name}</option>
            ))}
          </select>
        </div>

        <textarea
          value={form.text}
          onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
          placeholder='e.g., "Always include the contract number when referencing client agreements"'
        />

        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-aa-blue bg-sky-50'
              : 'border-gray-300 hover:border-aa-blue/50 hover:bg-gray-50'
          } ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-dark-text">
              <FileText size={16} className="text-aa-blue" />
              {file.name}
              <span className="text-xs text-secondary-text">({formatFileSize(file.size)})</span>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-gray-400 hover:text-red-500 ml-1"
              >
                <XCircle size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload size={18} className="text-gray-400" />
              <span className="text-xs text-secondary-text">Attach a file (optional) — PDF, DOCX, TXT</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => { if (e.target.files[0]) setFile(e.target.files[0]); e.target.value = ''; }}
            className="hidden"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.agentKey || !form.text.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
            {submitting ? 'Submitting...' : 'Submit Instruction'}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      {instructions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Agent filter */}
          <button
            onClick={() => setFilterAgent('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterAgent === 'all'
                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
            }`}
          >
            All Agents ({instructions.length})
          </button>
          {usedAgentKeys.map(key => {
            const count = instructions.filter(i => i.agent_key === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilterAgent(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filterAgent === key
                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                    : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                }`}
              >
                {agentName(key)} ({count})
              </button>
            );
          })}

          <div className="w-px bg-gray-200 mx-1" />

          {/* Status filter */}
          {['all', 'pending', 'approved', 'rejected'].map(s => {
            const count = s === 'all' ? instructions.length : instructions.filter(i => i.status === s).length;
            if (s !== 'all' && count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filterStatus === s
                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                    : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Instructions list */}
      {filtered.length === 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-secondary-text">
          {instructions.length === 0 ? 'No instructions submitted yet.' : 'No instructions match this filter.'}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((instr) => {
            const badge = STATUS_BADGE[instr.status];
            const BadgeIcon = badge.icon;
            const isReviewing = reviewingId === instr.id;
            const isLoading = actionLoading === instr.id;
            const propagatedSourceName = sourceInstrAgent(instr.propagated_from);
            // Other agents to propagate to (exclude current instruction's agent)
            const otherAgents = agents.filter(a => a.agent_key !== instr.agent_key);

            return (
              <div key={instr.id} className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-aa-blue/10 text-aa-blue">
                          {agentName(instr.agent_key)}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.className}`}>
                          <BadgeIcon size={10} />
                          {badge.label}
                        </span>
                        {instr.file_name && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                            <FileText size={10} />
                            {instr.file_name}
                          </span>
                        )}
                        {propagatedSourceName && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-700">
                            <GitBranch size={10} />
                            Propagated from {propagatedSourceName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-dark-text whitespace-pre-wrap">{instr.instruction_text}</p>
                      <div className="text-xs text-secondary-text mt-1">
                        {instr.profiles?.full_name || 'Unknown'} · {new Date(instr.created_at).toLocaleDateString()}
                        {instr.reviewer?.full_name && (
                          <span className="ml-2 text-gray-400">
                            Reviewed by {instr.reviewer.full_name}
                            {instr.reviewed_at && ` · ${new Date(instr.reviewed_at).toLocaleDateString()}`}
                          </span>
                        )}
                        {instr.review_note && (
                          <span className="ml-2 text-gray-400">— {instr.review_note}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons — super-admin only, pending only */}
                    {isSuperAdmin && instr.status === 'pending' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openReview(instr.id, 'approve')}
                          disabled={isLoading}
                          className={`p-1.5 rounded-md transition-colors ${
                            isReviewing && reviewMode === 'approve'
                              ? 'bg-green-100 text-green-700'
                              : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                          }`}
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => openReview(instr.id, 'reject')}
                          disabled={isLoading}
                          className={`p-1.5 rounded-md transition-colors ${
                            isReviewing && reviewMode === 'reject'
                              ? 'bg-red-100 text-red-700'
                              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                          }`}
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded review panel */}
                {isReviewing && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
                    {reviewMode === 'approve' && otherAgents.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-dark-text block mb-1.5">
                          Also apply to:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {otherAgents.map(a => (
                            <label
                              key={a.agent_key}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border cursor-pointer transition-colors ${
                                propagateAgents.includes(a.agent_key)
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={propagateAgents.includes(a.agent_key)}
                                onChange={() => togglePropagateAgent(a.agent_key)}
                                className="sr-only"
                              />
                              {propagateAgents.includes(a.agent_key) && <Check size={12} />}
                              {a.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-dark-text block mb-1">
                        Review note <span className="text-secondary-text font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder={reviewMode === 'approve' ? 'e.g., Good practice — applying broadly' : 'e.g., Too vague, needs specifics'}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {reviewMode === 'approve' ? (
                        <button
                          onClick={() => handleApprove(instr)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          {propagateAgents.length > 0
                            ? `Approve & Propagate to ${propagateAgents.length}`
                            : 'Approve'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReject(instr.id)}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                          Reject
                        </button>
                      )}
                      <button
                        onClick={closeReview}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-sm text-secondary-text hover:text-dark-text transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
