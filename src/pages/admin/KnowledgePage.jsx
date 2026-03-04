import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Loader2, Upload, FileText, Trash2,
  ChevronDown, ChevronUp, XCircle, CheckCircle, Pencil, X, Check, Sparkles,
} from 'lucide-react';
import { supabase, getFreshToken } from '../../lib/supabase';
import { buildDocumentPath, formatFileSize } from '../../utils/storagePaths';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import { useUser } from '../../contexts/UserContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const DOC_TYPES = [
  { key: 'sop', label: 'SOP' },
  { key: 'policy', label: 'Policy' },
  { key: 'reference', label: 'Reference' },
  { key: 'template', label: 'Template' },
  { key: 'other', label: 'Other' },
];

const FILE_TYPE_BADGE = {
  pdf: 'bg-red-50 text-red-700',
  docx: 'bg-blue-50 text-blue-700',
  txt: 'bg-gray-100 text-gray-700',
};

const DOC_TYPE_BADGE = {
  sop: 'bg-sky-50 text-sky-700',
  policy: 'bg-purple-50 text-purple-700',
  reference: 'bg-green-50 text-green-700',
  template: 'bg-cyan-50 text-cyan-700',
  other: 'bg-gray-100 text-gray-600',
};

/* ─── Text Preview Sub-component ─── */

function DocumentTextPreview({ docId }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('tenant_documents')
        .select('extracted_text')
        .eq('id', docId)
        .single();

      if (cancelled) return;

      if (err) {
        setError(err.message);
      } else {
        setText(data?.extracted_text || '');
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [docId]);

  if (loading) {
    return (
      <div className="border-t border-gray-100 px-4 py-4 flex items-center justify-center">
        <Loader2 size={16} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-gray-100 px-4 py-3 text-xs text-red-500">
        Failed to load text: {error}
      </div>
    );
  }

  if (!text) {
    return (
      <div className="border-t border-gray-100 px-4 py-3 text-xs text-secondary-text italic">
        No extracted text available.
      </div>
    );
  }

  const preview = text.length > 3000 ? text.slice(0, 3000) + '\n\n... (truncated)' : text;

  return (
    <div className="border-t border-gray-100 px-4 py-3">
      <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap break-words">
        {preview}
      </pre>
    </div>
  );
}

/* ─── Main Knowledge Page ─── */

export default function KnowledgePage({ embedded = false }) {
  const { tenantId } = useTenantId();
  const { workspaces, refreshAll } = useTenantPortal();
  const { isAdmin } = useUser();

  // Derive departments from workspaces dynamically
  const DEPARTMENTS = useMemo(() => [
    { key: 'all', label: 'All' },
    ...workspaces.map(ws => ({ key: ws.department_key, label: ws.name })),
    { key: 'admin', label: 'Admin' },
    { key: 'general', label: 'General' },
  ], [workspaces]);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDept, setUploadDept] = useState('general');
  const [uploadDocType, setUploadDocType] = useState('sop');
  const [filterDept, setFilterDept] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Embedding status state
  const [embeddingStatus, setEmbeddingStatus] = useState(null);
  const [embedding, setEmbedding] = useState(false);

  // Inline department editing state (admin/super-admin only)
  const [editingDeptDocId, setEditingDeptDocId] = useState(null);
  const [addingNewDept, setAddingNewDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const deptSelectRef = useRef(null);
  const newDeptInputRef = useRef(null);

  useEffect(() => {
    loadDocuments();
    loadEmbeddingStatus();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('tenant_documents')
      .select('id, file_name, file_type, file_size, department, doc_type, char_count, page_count, status, title, description, created_at')
      .eq('tenant_id', tenantId)
      .eq('source', 'tenant')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }

  async function loadEmbeddingStatus() {
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/embeddings/${tenantId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmbeddingStatus(data);
      }
    } catch (err) {
      // Non-critical — just don't show embedding status
      console.log('[knowledge] Could not load embedding status:', err.message);
    }
  }

  async function handleEmbedAll() {
    setEmbedding(true);
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/embeddings/${tenantId}/embed-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess(`Embedded ${data.documents_embedded} documents (${data.total_chunks} chunks)${data.errors ? `, ${data.errors} errors` : ''}`);
        setTimeout(() => setSuccess(null), 5000);
        loadEmbeddingStatus();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to embed documents');
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      setError('Embedding failed: ' + err.message);
      setTimeout(() => setError(null), 4000);
    }
    setEmbedding(false);
  }

  async function handleFiles(files) {
    const validFiles = Array.from(files).filter((f) => {
      const name = f.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt');
    });

    if (validFiles.length === 0) {
      setError('No supported files selected. Upload PDF, DOCX, or TXT files.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    if (validFiles.some((f) => f.size > 20 * 1024 * 1024)) {
      setError('One or more files exceed the 20 MB limit.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const { extractText } = await import('../../utils/docExtractor.js');

    let uploaded = 0;
    let failed = 0;

    for (const file of validFiles) {
      try {
        const result = await extractText(file);
        const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf'
          : file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'txt';

        const storagePath = buildDocumentPath(tenantId, uploadDept, file.name);
        const { error: uploadErr } = await supabase.storage
          .from('tenant-documents')
          .upload(storagePath, file);

        if (uploadErr) throw uploadErr;

        const { data: insertedDoc, error: insertErr } = await supabase
          .from('tenant_documents')
          .insert({
            tenant_id: tenantId,
            department: uploadDept,
            doc_type: uploadDocType,
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            storage_path: storagePath,
            page_count: result.pageCount || null,
            extracted_text: result.text,
            char_count: result.text.length,
            status: result.warning ? 'failed' : 'extracted',
            status_detail: result.warning || null,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        uploaded++;

        // Auto-embed if extraction succeeded
        if (!result.warning && insertedDoc?.id) {
          getFreshToken().then(token =>
            fetch(`${BACKEND_URL}/api/embeddings/${tenantId}/embed-document/${insertedDoc.id}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {}) // Non-critical
          );
        }
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        failed++;
      }
    }

    setUploading(false);

    if (uploaded > 0) {
      setSuccess(`${uploaded} document${uploaded > 1 ? 's' : ''} uploaded${failed > 0 ? ` (${failed} failed)` : ''}`);
      setTimeout(() => setSuccess(null), 4000);
      loadDocuments();
      // Refresh embedding status after a short delay (auto-embed is async)
      setTimeout(() => loadEmbeddingStatus(), 3000);
    }
    if (failed > 0 && uploaded === 0) {
      setError(`Failed to upload ${failed} file${failed > 1 ? 's' : ''}`);
      setTimeout(() => setError(null), 4000);
    }
  }

  async function handleDelete(docId) {
    setDeleting(docId);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from('tenant_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', docId);

      if (updateErr) throw updateErr;

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess('Document deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
    setDeleting(null);
    setConfirmDelete(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  /* ─── Inline Department Editing ─── */

  async function updateDocumentDepartment(docId, newDept) {
    // Find workspace for the new department to get workspace_id
    const ws = workspaces.find(w => w.department_key === newDept);
    const newWorkspaceId = ws?.id || null;

    // 1. Update the document's department
    const { error: docErr } = await supabase
      .from('tenant_documents')
      .update({ department: newDept })
      .eq('id', docId);

    if (docErr) throw docErr;

    // 2. Cascade: update sop_analyses.department
    await supabase
      .from('sop_analyses')
      .update({ department: newDept })
      .eq('document_id', docId);

    // 3. Cascade: update tenant_sop_steps.department and workspace_id
    const stepUpdate = { department: newDept };
    if (newWorkspaceId) stepUpdate.workspace_id = newWorkspaceId;
    await supabase
      .from('tenant_sop_steps')
      .update(stepUpdate)
      .eq('document_id', docId);
  }

  async function handleDeptSelect(docId, value) {
    if (value === '__new__') {
      setAddingNewDept(true);
      setNewDeptName('');
      setTimeout(() => newDeptInputRef.current?.focus(), 0);
      return;
    }

    setSavingDept(true);
    try {
      await updateDocumentDepartment(docId, value);
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, department: value } : d));
      setEditingDeptDocId(null);
      setSuccess('Department updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
    setSavingDept(false);
  }

  async function handleNewDeptSave(docId) {
    const name = newDeptName.trim();
    if (!name) return;

    const deptKey = name.toLowerCase().replace(/\s+/g, '-');
    setSavingDept(true);

    try {
      // Upsert workspace for the new department
      const { error: wsErr } = await supabase
        .from('tenant_workspaces')
        .upsert(
          { tenant_id: tenantId, department_key: deptKey, name, sort_order: 99, is_active: true },
          { onConflict: 'tenant_id,department_key' },
        );

      if (wsErr) throw wsErr;

      // Update the document
      await updateDocumentDepartment(docId, deptKey);
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, department: deptKey } : d));

      // Refresh workspaces so DEPARTMENTS list updates
      await refreshAll();

      setEditingDeptDocId(null);
      setAddingNewDept(false);
      setNewDeptName('');
      setSuccess(`Department "${name}" created and assigned`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
    setSavingDept(false);
  }

  function cancelDeptEdit() {
    setEditingDeptDocId(null);
    setAddingNewDept(false);
    setNewDeptName('');
  }

  // Close dropdown on Escape
  useEffect(() => {
    if (!editingDeptDocId) return;
    function handleKey(e) {
      if (e.key === 'Escape') cancelDeptEdit();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [editingDeptDocId]);

  const filtered = filterDept === 'all'
    ? documents
    : documents.filter((d) => d.department === filterDept);

  const totalChars = documents.reduce((sum, d) => sum + (d.char_count || 0), 0);
  const deptSet = new Set(documents.map((d) => d.department));
  const deptCounts = {};
  documents.forEach((d) => { deptCounts[d.department] = (deptCounts[d.department] || 0) + 1; });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-dark-text">Knowledge Base</h1>
          <p className="text-sm text-secondary-text mt-1">
            Upload SOPs, policies, and reference documents. Extracted text is used as context for AI agents.
          </p>
        </div>
      )}

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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Documents</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{documents.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Extracted Text</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">
            {totalChars >= 1000 ? `${(totalChars / 1000).toFixed(0)}K` : totalChars} chars
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Departments</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{deptSet.size}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Semantic Search</div>
          {embeddingStatus ? (
            <div className="mt-1">
              <div className="text-2xl font-semibold text-dark-text">
                {embeddingStatus.coverage_pct}%
              </div>
              <div className="text-[11px] text-secondary-text">
                {embeddingStatus.embedded_documents}/{embeddingStatus.total_documents} docs · {embeddingStatus.total_chunks} chunks
              </div>
              {isAdmin && embeddingStatus.coverage_pct < 100 && (
                <button
                  onClick={handleEmbedAll}
                  disabled={embedding}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-aa-blue hover:text-aa-blue/80 font-medium disabled:opacity-50"
                >
                  {embedding ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  {embedding ? 'Embedding...' : 'Embed All'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-secondary-text mt-1">—</div>
          )}
        </div>
      </div>

      {/* Upload section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-dark-text">Upload Documents</h3>
        <div className="flex gap-3">
          <select
            value={uploadDept}
            onChange={(e) => setUploadDept(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
          >
            {DEPARTMENTS.filter((d) => d.key !== 'all').map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <select
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-aa-blue bg-sky-50'
              : 'border-gray-300 hover:border-aa-blue/50 hover:bg-gray-50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-aa-blue animate-spin" />
              <span className="text-sm text-secondary-text">Extracting text and uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-gray-400" />
              <span className="text-sm text-secondary-text">Drop documents here or click to upload</span>
              <span className="text-xs text-gray-400">PDF, DOCX, TXT — max 20 MB</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => { if (e.target.files.length > 0) handleFiles(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
        </div>
      </div>

      {/* Filter pills */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => {
            const count = dept.key === 'all' ? documents.length : (deptCounts[dept.key] || 0);
            if (dept.key !== 'all' && count === 0) return null;
            const isActive = filterDept === dept.key;
            return (
              <button
                key={dept.key}
                onClick={() => setFilterDept(dept.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  isActive
                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                    : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                }`}
              >
                {dept.label}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Document list */}
      {filtered.length === 0 && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-secondary-text">
          {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match this filter.'}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const isExpanded = expandedDoc === doc.id;
            return (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="group px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-dark-text truncate">{doc.file_name}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded uppercase ${FILE_TYPE_BADGE[doc.file_type] || 'bg-gray-100 text-gray-600'}`}>
                          {doc.file_type}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded uppercase ${DOC_TYPE_BADGE[doc.doc_type] || 'bg-gray-100 text-gray-600'}`}>
                          {doc.doc_type}
                        </span>
                        {isAdmin && editingDeptDocId === doc.id ? (
                          addingNewDept ? (
                            <span className="inline-flex items-center gap-1">
                              <input
                                ref={newDeptInputRef}
                                type="text"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleNewDeptSave(doc.id);
                                  if (e.key === 'Escape') cancelDeptEdit();
                                }}
                                placeholder="Department name"
                                disabled={savingDept}
                                className="px-1.5 py-0.5 text-[10px] font-medium rounded border border-gray-300 focus:border-aa-blue focus:outline-none w-24"
                              />
                              <button
                                onClick={() => handleNewDeptSave(doc.id)}
                                disabled={savingDept || !newDeptName.trim()}
                                className="p-0.5 text-green-600 hover:text-green-700 disabled:opacity-40"
                                title="Save"
                              >
                                {savingDept ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                              </button>
                              <button
                                onClick={cancelDeptEdit}
                                disabled={savingDept}
                                className="p-0.5 text-gray-400 hover:text-gray-600"
                                title="Cancel"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ) : (
                            <select
                              ref={deptSelectRef}
                              value={doc.department}
                              onChange={(e) => handleDeptSelect(doc.id, e.target.value)}
                              onBlur={() => { if (!addingNewDept) cancelDeptEdit(); }}
                              disabled={savingDept}
                              autoFocus
                              className="px-1 py-0.5 text-[10px] font-medium rounded border border-gray-300 focus:border-aa-blue focus:outline-none bg-white capitalize cursor-pointer"
                            >
                              {DEPARTMENTS.filter(d => d.key !== 'all').map(d => (
                                <option key={d.key} value={d.key}>{d.label}</option>
                              ))}
                              <option disabled>──────</option>
                              <option value="__new__">+ Add new…</option>
                            </select>
                          )
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600 capitalize${isAdmin ? ' cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
                            onClick={isAdmin ? (e) => { e.stopPropagation(); setEditingDeptDocId(doc.id); setAddingNewDept(false); } : undefined}
                            title={isAdmin ? 'Click to change department' : undefined}
                          >
                            {doc.department}
                            {isAdmin && <Pencil size={8} className="inline ml-1 opacity-0 group-hover:opacity-50" />}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary-text">
                        <span>{formatFileSize(doc.file_size)}</span>
                        {doc.page_count && <span>· {doc.page_count} pages</span>}
                        {doc.char_count && <span>· {doc.char_count.toLocaleString()} chars</span>}
                        <span>· {new Date(doc.created_at).toLocaleDateString()}</span>
                        {doc.status === 'failed' && (
                          <span className="text-red-500 font-medium">· Extraction failed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      className="p-1 text-gray-400 hover:text-aa-blue transition-colors"
                      title={isExpanded ? 'Collapse preview' : 'Preview extracted text'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {confirmDelete === doc.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                          className="px-2 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {deleting === doc.id ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs text-secondary-text hover:text-dark-text transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(doc.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <DocumentTextPreview docId={doc.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
