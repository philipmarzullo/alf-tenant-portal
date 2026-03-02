import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Upload, Loader2, Trash2, Pencil, XCircle, CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildDocumentPath } from '../../utils/storagePaths';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import DeptBadge from '../../components/shared/DeptBadge';

const STATUS_BADGES = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  extracted: { label: 'Published', cls: 'bg-green-50 text-green-700' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
};

export default function SOPBuilder() {
  const navigate = useNavigate();
  const { tenantId } = useTenantId();
  const { workspaces } = useTenantPortal();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDept, setUploadDept] = useState(workspaces[0]?.department_key || 'ops');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const departments = useMemo(() => [
    ...workspaces.map(ws => ({ key: ws.department_key, label: ws.name })),
    { key: 'admin', label: 'Admin' },
    { key: 'general', label: 'General' },
  ], [workspaces]);

  useEffect(() => {
    loadDocuments();
  }, [tenantId]);

  async function loadDocuments() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('tenant_documents')
      .select('id, file_name, department, doc_type, status, created_at, structured_content, created_via')
      .eq('tenant_id', tenantId)
      .eq('doc_type', 'sop')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }

  function getTitle(doc) {
    if (doc.structured_content?.title) return doc.structured_content.title;
    return doc.file_name || 'Untitled SOP';
  }

  function getStatus(doc) {
    if (doc.status === 'extracted') return STATUS_BADGES.extracted;
    if (doc.status === 'failed') return STATUS_BADGES.failed;
    return STATUS_BADGES.draft;
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

        const { error: insertErr } = await supabase
          .from('tenant_documents')
          .insert({
            tenant_id: tenantId,
            department: uploadDept,
            doc_type: 'sop',
            file_name: file.name,
            file_type: fileType,
            file_size: file.size,
            storage_path: storagePath,
            page_count: result.pageCount || null,
            extracted_text: result.text,
            char_count: result.text.length,
            status: result.warning ? 'failed' : 'extracted',
            status_detail: result.warning || null,
            created_via: 'upload',
          });

        if (insertErr) throw insertErr;
        uploaded++;
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        failed++;
      }
    }

    setUploading(false);
    setShowUpload(false);

    if (uploaded > 0) {
      setSuccess(`${uploaded} SOP${uploaded > 1 ? 's' : ''} uploaded${failed > 0 ? ` (${failed} failed)` : ''}`);
      setTimeout(() => setSuccess(null), 4000);
      loadDocuments();
    }
    if (failed > 0 && uploaded === 0) {
      setError(`Failed to upload ${failed} file${failed > 1 ? 's' : ''}`);
      setTimeout(() => setError(null), 4000);
    }
  }

  async function handleDelete(docId) {
    setDeleting(docId);
    try {
      const { error: updateErr } = await supabase
        .from('tenant_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', docId);

      if (updateErr) throw updateErr;
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess('SOP deleted');
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
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-aa-blue/10 rounded-lg">
            <FileText size={20} className="text-aa-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-dark-text">SOP Builder</h1>
            <p className="text-sm text-secondary-text">
              Create, upload, and manage Standard Operating Procedures
            </p>
          </div>
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

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/portal/tools/sop-builder/new')}
          className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-aa-blue/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-aa-blue/10 rounded-lg group-hover:bg-aa-blue/15 transition-colors">
              <Plus size={20} className="text-aa-blue" />
            </div>
            <h3 className="text-sm font-semibold text-dark-text">Create New SOP</h3>
          </div>
          <p className="text-xs text-secondary-text">
            Build a structured SOP from scratch with AI-guided section writing
          </p>
        </button>

        <button
          onClick={() => setShowUpload(true)}
          className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-aa-blue/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-aa-blue/10 rounded-lg group-hover:bg-aa-blue/15 transition-colors">
              <Upload size={20} className="text-aa-blue" />
            </div>
            <h3 className="text-sm font-semibold text-dark-text">Upload SOP</h3>
          </div>
          <p className="text-xs text-secondary-text">
            Import existing SOPs from PDF, DOCX, or TXT files
          </p>
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => !uploading && setShowUpload(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Upload SOP Documents</h2>

              <div className="mb-4">
                <label className="block text-xs font-medium text-secondary-text mb-1">Department</label>
                <select
                  value={uploadDept}
                  onChange={(e) => setUploadDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
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
                    <span className="text-sm text-secondary-text">Drop files here or click to upload</span>
                    <span className="text-xs text-gray-400">PDF, DOCX, TXT — max 20 MB</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => { if (e.target.files.length > 0) handleFiles(e.target.files); e.target.value = ''; }}
                  className="hidden"
                />
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowUpload(false)}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-secondary-text hover:text-dark-text disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SOP Table */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-secondary-text">No SOPs yet.</div>
          <div className="text-xs text-secondary-text mt-1">
            Create a new SOP or upload an existing one to get started.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Title</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Department</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Status</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Created</th>
                <th className="text-right text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map(doc => {
                const status = getStatus(doc);
                const isBuilderCreated = doc.created_via === 'builder';

                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-dark-text">{getTitle(doc)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <DeptBadge dept={doc.department} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-secondary-text">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isBuilderCreated && (
                          <button
                            onClick={() => navigate(`/portal/tools/sop-builder/edit/${doc.id}`)}
                            className="p-1.5 text-secondary-text hover:text-aa-blue transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {confirmDelete === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleting === doc.id}
                              className="px-2 py-1 text-[11px] font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                            >
                              {deleting === doc.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 text-[11px] text-secondary-text hover:text-dark-text"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(doc.id)}
                            className="p-1.5 text-secondary-text hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
