import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSearch, Plus, BookOpen, Loader2, XCircle, CheckCircle,
  Bot, Calendar, Building2, Upload, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildDocumentPath } from '../../utils/storagePaths';
import { useTenantId } from '../../contexts/TenantIdContext';
import AgentChatPanel from '../../components/shared/AgentChatPanel';

const STATUS_FILTERS = ['all', 'draft', 'in_progress', 'review', 'submitted', 'won', 'lost'];

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
  review: { label: 'Review', cls: 'bg-purple-50 text-purple-700' },
  submitted: { label: 'Submitted', cls: 'bg-cyan-50 text-cyan-700' },
  won: { label: 'Won', cls: 'bg-green-50 text-green-700' },
  lost: { label: 'Lost', cls: 'bg-red-50 text-red-700' },
};

export default function RFPProjectsPage() {
  const navigate = useNavigate();
  const { tenantId } = useTenantId();
  const fileInputRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');

  // New project modal
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    issuing_organization: '',
    due_date: '',
    output_mode: 'response_document',
    doc_style: 'formal_questionnaire',
  });
  const [newFiles, setNewFiles] = useState([]);
  const [creating, setCreating] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [tenantId]);

  async function loadProjects() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('tenant_rfp_projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newForm.name.trim()) {
      setError('Project name is required.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCreating(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    let sourceDocumentId = null;
    let sourceExcelPath = null;
    let parsedDocs = null;

    // Upload + parse RFP documents if provided
    if (newFiles.length > 0) {
      try {
        const { extractText, parseRfpDocuments } = await import('../../utils/docExtractor.js');

        // Parse all files into normalized RFP structure
        parsedDocs = await parseRfpDocuments(newFiles);

        // Upload each file and create a tenant_documents row for the FIRST file
        // (source_document_id is single — additional files stored as related docs)
        const uploadedDocIds = [];
        for (const file of newFiles) {
          const result = await extractText(file);
          const lower = file.name.toLowerCase();
          const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');
          const fileType = lower.endsWith('.pdf') ? 'pdf'
            : lower.endsWith('.docx') || lower.endsWith('.doc') ? 'docx'
            : isExcel ? 'xlsx'
            : 'txt';

          const storagePath = buildDocumentPath(tenantId, 'rfp_source', file.name);
          const { error: uploadErr } = await supabase.storage
            .from('tenant-documents')
            .upload(storagePath, file);

          if (uploadErr) throw uploadErr;

          // Remember the first Excel file's storage path for write-back
          if (isExcel && !sourceExcelPath) {
            sourceExcelPath = storagePath;
          }

          const { data: doc, error: insertErr } = await supabase
            .from('tenant_documents')
            .insert({
              tenant_id: tenantId,
              department: 'sales',
              doc_type: 'reference',
              document_scope: 'rfp_source',
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
          uploadedDocIds.push(doc.id);
        }
        sourceDocumentId = uploadedDocIds[0] || null;
      } catch (err) {
        console.error('Failed to upload RFP documents:', err);
        setError('Failed to upload documents. Project created without them.');
        setTimeout(() => setError(null), 4000);
      }
    }

    // Detect document type from parsed files
    let detectedType = null;
    if (parsedDocs?.files?.length) {
      const types = new Set(parsedDocs.files.map(f => f.type));
      const hasExcel = parsedDocs.files.some(f => f.type === 'xlsx');
      const hasPricing = parsedDocs.files.some(f => f.pricing_sheets?.length);
      const hasQuestionnaire = parsedDocs.files.some(f => f.questionnaire_sheet);

      if (hasExcel && hasPricing && !hasQuestionnaire) detectedType = 'excel_pricing';
      else if (hasExcel && hasQuestionnaire && !hasPricing) detectedType = 'excel_questionnaire';
      else if (hasExcel && hasPricing && hasQuestionnaire) detectedType = 'mixed';
      else if (types.has('pdf')) detectedType = 'pdf_questionnaire';
      else if (types.has('docx')) detectedType = 'docx_questionnaire';
      else detectedType = 'unknown';
    }

    // Build pricing_inputs scaffold from parsed staffing rows (only when we
    // parsed at least one pricing sheet). Keys are sheet names, values are
    // arrays of { row, role, num_staff, hours_per_day, days_per_week,
    // wage_rate } — hours/days/rate start at 0 for the user to fill in.
    const pricingInputs = {};
    if (parsedDocs?.files?.length) {
      for (const file of parsedDocs.files) {
        if (!file.pricing_sheets?.length) continue;
        for (const sheet of file.pricing_sheets) {
          if (!sheet.staffing?.length) continue;
          pricingInputs[sheet.name] = sheet.staffing.map(s => ({
            row: s.row,
            role: s.role,
            num_staff: s.num_staff,
            hours_per_day: 0,
            days_per_week: 0,
            wage_rate: 0,
          }));
        }
      }
    }

    const wantsExcel = ['fill_excel', 'both'].includes(newForm.output_mode);

    // Auto-select corporate_excel_response when output_mode='both' AND the
    // source is an Excel RFP. The Excel handles the formal submission; this
    // doc style produces the leave-behind proposal that wins the room.
    // The user can still override by manually picking another style first.
    let effectiveDocStyle = newForm.doc_style;
    const isExcelSource = detectedType && detectedType.includes('excel');
    if (
      newForm.output_mode === 'both' &&
      isExcelSource &&
      newForm.doc_style === 'formal_questionnaire'
    ) {
      effectiveDocStyle = 'corporate_excel_response';
    }

    const { data: project, error: createErr } = await supabase
      .from('tenant_rfp_projects')
      .insert({
        tenant_id: tenantId,
        name: newForm.name.trim(),
        issuing_organization: newForm.issuing_organization.trim() || null,
        due_date: newForm.due_date || null,
        source_document_id: sourceDocumentId,
        output_mode: newForm.output_mode,
        doc_style: effectiveDocStyle,
        detected_type: detectedType,
        source_excel_path: wantsExcel ? sourceExcelPath : null,
        pricing_inputs: pricingInputs,
        created_by: user?.id,
      })
      .select()
      .single();

    // If we parsed items client-side (Excel path), insert them directly so
    // the agent parse step is unnecessary and source_cell is preserved for
    // write-back. For PDF/DOCX without client-parsed items, the user runs
    // the agent parse action in the detail view.
    if (!createErr && project && parsedDocs?.items?.length) {
      const itemRows = parsedDocs.items.map((it, idx) => ({
        tenant_id: tenantId,
        rfp_project_id: project.id,
        item_number: idx + 1,
        question_text: it.text,
        section: parsedDocs.sections.find(s => s.id === it.section_id)?.title || 'General',
        category: it.category || 'other',
        source_cell: it.source_cell || null,
        status: 'pending',
      }));
      const { error: itemsErr } = await supabase.from('tenant_rfp_items').insert(itemRows);
      if (itemsErr) {
        console.error('Failed to insert parsed items:', itemsErr);
      } else {
        // Update item_count on project
        await supabase
          .from('tenant_rfp_projects')
          .update({ item_count: itemRows.length, status: 'in_progress' })
          .eq('id', project.id);
      }
    }

    if (createErr) {
      setError(createErr.message);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess('Project created');
      setTimeout(() => setSuccess(null), 3000);
      setShowNew(false);
      setNewForm({
        name: '',
        issuing_organization: '',
        due_date: '',
        output_mode: 'response_document',
        doc_style: 'formal_questionnaire',
      });
      setNewFiles([]);
      navigate(`/portal/tools/rfp-response/${project.id}`);
    }
    setCreating(false);
  }

  // Filter
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter(p => p.status === statusFilter);
  }, [projects, statusFilter]);

  // Stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => ['in_progress', 'review'].includes(p.status)).length;
  const wonCount = projects.filter(p => p.status === 'won').length;
  const lostCount = projects.filter(p => p.status === 'lost').length;
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;

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
          <div className="p-2 bg-aa-blue/10 rounded-lg">
            <FileSearch size={20} className="text-aa-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-dark-text">RFP Response Builder</h1>
            <p className="text-sm text-secondary-text">
              Parse RFPs, match answers, and draft winning responses
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Total Projects</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{totalProjects}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Active</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">{activeProjects}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-secondary-text uppercase tracking-wider">Win Rate</div>
          <div className="text-2xl font-semibold text-dark-text mt-1">
            {winRate !== null ? `${winRate}%` : '—'}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setShowNew(true)}
          className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-aa-blue/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-aa-blue/10 rounded-lg group-hover:bg-aa-blue/15 transition-colors">
              <Plus size={20} className="text-aa-blue" />
            </div>
            <h3 className="text-sm font-semibold text-dark-text">New RFP Project</h3>
          </div>
          <p className="text-xs text-secondary-text">
            Start a new RFP response project — upload the RFP document to get started
          </p>
        </button>

        <button
          onClick={() => navigate('/portal/tools/rfp-response/library')}
          className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:border-aa-blue/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-aa-blue/10 rounded-lg group-hover:bg-aa-blue/15 transition-colors">
              <BookOpen size={20} className="text-aa-blue" />
            </div>
            <h3 className="text-sm font-semibold text-dark-text">Q&A Library</h3>
          </div>
          <p className="text-xs text-secondary-text">
            Manage curated question-answer pairs that power auto-matching
          </p>
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(s => {
          const count = s === 'all' ? projects.length : projects.filter(p => p.status === s).length;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ${
                isActive
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Projects Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileSearch size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-secondary-text">
            {projects.length === 0 ? 'No RFP projects yet.' : 'No projects match this filter.'}
          </div>
          {projects.length === 0 && (
            <div className="text-xs text-secondary-text mt-1">
              Create a new project or build your Q&A library to get started.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Name</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Organization</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Due Date</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Status</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Progress</th>
                <th className="text-left text-[11px] font-semibold text-secondary-text uppercase tracking-wider px-4 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(project => {
                const status = STATUS_BADGE[project.status] || STATUS_BADGE.draft;
                const progress = project.item_count > 0
                  ? Math.round((project.approved_count / project.item_count) * 100)
                  : 0;
                const isDueSoon = project.due_date && new Date(project.due_date) < new Date(Date.now() + 7 * 86400000);

                return (
                  <tr
                    key={project.id}
                    onClick={() => navigate(`/portal/tools/rfp-response/${project.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-dark-text">{project.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-secondary-text flex items-center gap-1">
                        {project.issuing_organization ? (
                          <><Building2 size={12} className="shrink-0" /> {project.issuing_organization}</>
                        ) : (
                          '—'
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {project.due_date ? (
                        <div className={`text-sm flex items-center gap-1 ${isDueSoon ? 'text-red-600 font-medium' : 'text-secondary-text'}`}>
                          <Calendar size={12} className="shrink-0" />
                          {new Date(project.due_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-secondary-text">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {project.item_count > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-aa-blue rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-secondary-text">
                            {project.approved_count}/{project.item_count}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-secondary-text">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-secondary-text">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Project Modal */}
      {showNew && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => !creating && setShowNew(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-dark-text">New RFP Project</h2>
                <button onClick={() => setShowNew(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                    placeholder="City of Springfield — Janitorial Services RFP"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary-text mb-1">Issuing Organization</label>
                    <input
                      type="text"
                      value={newForm.issuing_organization}
                      onChange={e => setNewForm(f => ({ ...f, issuing_organization: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                      placeholder="City of Springfield"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-text mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newForm.due_date}
                      onChange={e => setNewForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">RFP Documents (optional)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const dropped = Array.from(e.dataTransfer.files || []).filter(f =>
                        /\.(pdf|docx?|txt|xlsx?|xls)$/i.test(f.name)
                      );
                      if (dropped.length) setNewFiles(prev => [...prev, ...dropped]);
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-aa-blue/50 hover:bg-gray-50 transition-colors"
                  >
                    {newFiles.length > 0 ? (
                      <div className="space-y-1.5 text-left">
                        {newFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <FileSearch size={14} className="text-aa-blue shrink-0" />
                            <span className="text-dark-text truncate flex-1">{f.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setNewFiles(prev => prev.filter((_, i) => i !== idx)); }}
                              className="text-gray-400 hover:text-red-500 shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="text-[11px] text-secondary-text pt-1.5 border-t border-gray-100 text-center">
                          Click or drop to add more
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={20} className="text-gray-400" />
                        <span className="text-sm text-secondary-text">Drop RFP documents or click to upload</span>
                        <span className="text-xs text-gray-400">PDF, DOCX, TXT, XLSX, XLS — multiple files OK</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.xlsx,.xls"
                      multiple
                      onChange={e => {
                        const picked = Array.from(e.target.files || []);
                        if (picked.length) setNewFiles(prev => [...prev, ...picked]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Output mode */}
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1.5">What should the agent produce?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { val: 'response_document', label: 'Written response document', desc: 'Generate a polished response in PDF or DOCX format' },
                      { val: 'fill_excel', label: 'Fill the Excel workbook', desc: 'Populate the source spreadsheet in place (requires Excel upload)' },
                      { val: 'both', label: 'Both', desc: 'Produce a written document AND fill the Excel workbook' },
                    ].map(opt => (
                      <label
                        key={opt.val}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          newForm.output_mode === opt.val
                            ? 'bg-aa-blue/5 border-aa-blue'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="output_mode"
                          value={opt.val}
                          checked={newForm.output_mode === opt.val}
                          onChange={e => setNewForm(f => ({ ...f, output_mode: e.target.value }))}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-dark-text">{opt.label}</div>
                          <div className="text-xs text-secondary-text">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Doc style — only shown when generating a document */}
                {newForm.output_mode !== 'fill_excel' && (
                  <div>
                    <label className="block text-xs font-medium text-secondary-text mb-1">Document style</label>
                    <select
                      value={newForm.doc_style}
                      onChange={e => setNewForm(f => ({ ...f, doc_style: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
                    >
                      <option value="formal_questionnaire">Formal Questionnaire — Q-then-A pairs (government RFPs)</option>
                      <option value="capabilities_brief">Capabilities Brief — narrative deck (sales-led RFPs)</option>
                      <option value="full_proposal">Full Proposal — cover, exec summary, sections</option>
                      <option value="corporate_excel_response">Corporate Excel Response — leave-behind proposal for Excel RFPs (auto-selected with "Both" + Excel source)</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowNew(false)}
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-secondary-text hover:text-dark-text disabled:opacity-40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newForm.name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 disabled:opacity-40 transition-colors"
                  >
                    {creating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      'Create Project'
                    )}
                  </button>
                </div>
              </div>
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
        context="RFP responses, project strategy, bid/no-bid analysis"
      />
    </div>
  );
}
