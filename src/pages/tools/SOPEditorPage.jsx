import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, ChevronDown, ChevronRight, Bot, Loader2, CheckCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import InlineAgentChat from '../../components/shared/InlineAgentChat';
import { SOP_ROLES, buildDepartmentList } from '../../data/sopConstants';

const SECTIONS = [
  { key: 'purpose', label: 'Purpose' },
  { key: 'scope', label: 'Scope' },
  { key: 'definitions', label: 'Definitions' },
  { key: 'responsibilities', label: 'Roles & Responsibilities' },
  { key: 'procedure', label: 'Procedure' },
  { key: 'safety', label: 'Safety & Compliance' },
  { key: 'references', label: 'References' },
];

function buildSuffix(title, department, sopRole, activeSection) {
  const sectionLabel = SECTIONS.find(s => s.key === activeSection)?.label || activeSection;
  const roleLabel = SOP_ROLES.find(r => r.key === sopRole)?.label || sopRole || 'Standard Procedure';
  return `You are an SOP Expert Assistant helping create Standard Operating Procedures for facility services operations.

Current SOP: ${title || 'Untitled'} | Department: ${department || 'Not set'} | Role: ${roleLabel} | Active Section: ${sectionLabel}

SOP Writing Guidelines:
- Purpose: Clear statement of why this procedure exists
- Scope: Who it applies to, what situations, exclusions
- Definitions: Industry-specific terms needing clarification
- Roles & Responsibilities: Who does what — role titles, not names
- Procedure: Numbered steps, specific and actionable. Include decision points, safety checks, quality gates
- Safety & Compliance: OSHA, PPE, chemical handling, emergency procedures
- References: Related SOPs, regulatory standards, equipment manuals

Standards:
- Write for a new employee's first day
- Include frequency (daily/weekly/monthly) where applicable
- Specify equipment and supplies by category
- Address common failure modes
- Use active voice (Clean, Inspect, Report, Document)
- Format in markdown for easy copying into the editor
- When drafting a section, provide complete content — not outlines`;
}

function renderToMarkdown(structured) {
  const roleLabel = SOP_ROLES.find(r => r.key === structured.sop_role)?.label || '';
  const lines = [`# ${structured.title}`];
  lines.push(`**Version:** ${structured.version} | **Effective Date:** ${structured.effectiveDate}${roleLabel ? ` | **Type:** ${roleLabel}` : ''}`);
  lines.push('');
  for (const section of structured.sections) {
    if (section.content?.trim()) {
      lines.push(`## ${section.label}`);
      lines.push(section.content.trim());
      lines.push('');
    }
  }
  return lines.join('\n');
}

export default function SOPEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId } = useTenantId();
  const { workspaces } = useTenantPortal();
  const chatRef = useRef(null);

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('operations');
  const [customDept, setCustomDept] = useState('');
  const [sopRole, setSopRole] = useState('standard-procedure');
  const [version, setVersion] = useState('1.0');
  const [sections, setSections] = useState(
    SECTIONS.map(s => ({ key: s.key, label: s.label, content: '' }))
  );
  const [collapsed, setCollapsed] = useState({});
  const [activeSection, setActiveSection] = useState('purpose');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [docId, setDocId] = useState(id || null);

  const departments = useMemo(() => buildDepartmentList(workspaces), [workspaces]);
  const effectiveDept = department === '__custom__' ? customDept.trim().toLowerCase().replace(/\s+/g, '-') : department;

  // Load existing document when editing
  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data, error } = await supabase
        .from('tenant_documents')
        .select('id, file_name, department, structured_content, status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) {
        navigate('/portal/tools/sop-builder');
        return;
      }

      const sc = data.structured_content;
      if (sc) {
        setTitle(sc.title || data.file_name || '');
        setVersion(sc.version || '1.0');
        setDepartment(data.department || 'operations');
        if (sc.sop_role) setSopRole(sc.sop_role);
        if (sc.sections?.length) {
          setSections(sc.sections.map(s => ({
            key: s.key,
            label: s.label || SECTIONS.find(sec => sec.key === s.key)?.label || s.key,
            content: s.content || '',
          })));
        }
      } else {
        setTitle(data.file_name || '');
        setDepartment(data.department || 'operations');
      }
      setDocId(data.id);
      setLoading(false);
    }
    load();
  }, [id, tenantId]);

  const structuredContent = useMemo(() => ({
    title,
    version,
    sop_role: sopRole,
    effectiveDate: new Date().toISOString().split('T')[0],
    sections,
  }), [title, version, sopRole, sections]);

  const systemPromptSuffix = useMemo(
    () => buildSuffix(title, effectiveDept, sopRole, activeSection),
    [title, effectiveDept, sopRole, activeSection]
  );

  function updateSection(key, content) {
    setSections(prev => prev.map(s => s.key === key ? { ...s, content } : s));
  }

  function toggleCollapse(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAskAI(sectionKey) {
    const section = SECTIONS.find(s => s.key === sectionKey);
    setActiveSection(sectionKey);
    const currentContent = sections.find(s => s.key === sectionKey)?.content?.trim();
    const prompt = currentContent
      ? `Please review and improve the "${section.label}" section of this SOP. Here's what I have so far:\n\n${currentContent}`
      : `Please draft the "${section.label}" section for the SOP titled "${title || 'Untitled'}".`;
    chatRef.current?.sendMessage(prompt);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setSaved(false);

    const dept = effectiveDept || 'operations';
    const payload = {
      tenant_id: tenantId,
      department: dept,
      doc_type: 'sop',
      file_name: `${title.trim()}.md`,
      file_type: 'md',
      status: 'draft',
      structured_content: structuredContent,
      created_via: 'builder',
    };

    try {
      if (docId) {
        const { error } = await supabase
          .from('tenant_documents')
          .update(payload)
          .eq('id', docId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tenant_documents')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setDocId(data.id);
        // Update URL to edit mode without re-mounting
        window.history.replaceState(null, '', `/portal/tools/sop-builder/edit/${data.id}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!title.trim()) return;
    setPublishing(true);

    const markdown = renderToMarkdown(structuredContent);
    const dept = effectiveDept || 'operations';
    const payload = {
      tenant_id: tenantId,
      department: dept,
      doc_type: 'sop',
      file_name: `${title.trim()}.md`,
      file_type: 'md',
      status: 'extracted',
      extracted_text: markdown,
      char_count: markdown.length,
      structured_content: structuredContent,
      created_via: 'builder',
    };

    try {
      if (docId) {
        const { error } = await supabase
          .from('tenant_documents')
          .update(payload)
          .eq('id', docId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tenant_documents')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setDocId(data.id);
      }
      navigate('/portal/tools/sop-builder');
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
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
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Top Bar */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 shrink-0 flex-wrap">
        <button
          onClick={() => navigate('/portal/tools/sop-builder')}
          className="p-1.5 text-secondary-text hover:text-dark-text transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="SOP Title..."
          className="flex-1 min-w-[200px] text-lg font-medium text-dark-text bg-transparent border-b border-transparent hover:border-gray-300 focus:border-aa-blue focus:outline-none px-1 py-0.5"
        />

        <div className="flex items-center gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
          >
            {departments.map(d => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
            <option value="__custom__">+ Custom</option>
          </select>
          {department === '__custom__' && (
            <input
              type="text"
              value={customDept}
              onChange={(e) => setCustomDept(e.target.value)}
              placeholder="Dept name..."
              className="w-28 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
            />
          )}
        </div>

        <select
          value={sopRole}
          onChange={(e) => setSopRole(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
        >
          {SOP_ROLES.map(r => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-secondary-text">v</span>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-12 px-1.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue text-center"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-secondary-text hover:text-dark-text hover:border-gray-300 disabled:opacity-40 flex items-center gap-1.5"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} className="text-green-500" /> : <Save size={14} />}
          {saved ? 'Saved' : 'Save Draft'}
        </button>

        <button
          onClick={handlePublish}
          disabled={publishing || !title.trim()}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-aa-blue text-white hover:bg-aa-blue/90 disabled:opacity-40 flex items-center gap-1.5"
        >
          {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Publish
        </button>
      </div>

      {/* Split Layout */}
      <div className="flex flex-1 min-h-0 mt-4 gap-0">
        {/* Left: Section Editor */}
        <div className="flex-[65] overflow-y-auto pr-4 space-y-3">
          {SECTIONS.map((sec) => {
            const isCollapsed = collapsed[sec.key];
            const sectionData = sections.find(s => s.key === sec.key);
            const hasContent = !!sectionData?.content?.trim();

            return (
              <div
                key={sec.key}
                className={`bg-white rounded-lg border transition-colors ${
                  activeSection === sec.key ? 'border-aa-blue/40' : 'border-gray-200'
                }`}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
                  onClick={() => toggleCollapse(sec.key)}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-secondary-text" />
                    ) : (
                      <ChevronDown size={14} className="text-secondary-text" />
                    )}
                    <span className="text-sm font-medium text-dark-text">{sec.label}</span>
                    {hasContent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAskAI(sec.key); }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-aa-blue bg-aa-blue/5 rounded hover:bg-aa-blue/10 transition-colors"
                  >
                    <Bot size={11} />
                    Ask AI
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="px-4 pb-3">
                    <textarea
                      value={sectionData?.content || ''}
                      onChange={(e) => updateSection(sec.key, e.target.value)}
                      onFocus={() => setActiveSection(sec.key)}
                      placeholder={`Write the ${sec.label.toLowerCase()} for this SOP... (supports markdown)`}
                      className="w-full min-h-[120px] px-3 py-2 text-sm text-dark-text border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-y leading-relaxed"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Agent Chat */}
        <div className="flex-[35] min-w-[280px] max-w-[400px]">
          <InlineAgentChat
            ref={chatRef}
            agentKey="admin"
            agentName="SOP Expert"
            context={title || 'New SOP'}
            systemPromptSuffix={systemPromptSuffix}
          />
        </div>
      </div>
    </div>
  );
}
