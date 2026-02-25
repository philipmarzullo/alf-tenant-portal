import { useState, useRef } from 'react';
import { FileBarChart, Plus, Trash2, Upload, X, Image, ChevronLeft, ChevronRight, Download, Clock, RotateCcw, FileText, ChevronDown, ChevronUp, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { extractText } from '../../utils/docExtractor';
import { parseQBUExcel } from '../../utils/qbuExcelParser';
import AgentActionButton from '../../components/shared/AgentActionButton';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';
import { getQBUHistory, saveQBU, getQBUById, deleteQBU } from '../../data/qbuHistory';
import { generateQBUPptx } from '../../utils/qbuPptxTemplate';

// ── Helpers ──────────────────────────────────────────────

const Label = ({ children, hint }) => (
  <label className="block text-xs font-medium text-secondary-text mb-1">
    {children}
    {hint && <span className="font-normal text-secondary-text/60 ml-1">— {hint}</span>}
  </label>
);

const Input = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue ${className}`}
  />
);

const Area = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
  />
);

const SectionHeading = ({ children, description }) => (
  <div className="mb-4">
    <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider">{children}</h3>
    {description && <p className="text-xs text-secondary-text/70 mt-1">{description}</p>}
  </div>
);

const AddRowBtn = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors mt-2"
  >
    <Plus size={12} /> {label}
  </button>
);

const RemoveBtn = ({ onClick }) => (
  <button onClick={onClick} className="p-1 text-gray-300 hover:text-status-red transition-colors shrink-0">
    <Trash2 size={14} />
  </button>
);

const ReviewSection = ({ title, lines }) => {
  const filtered = lines.filter(Boolean);
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1.5">{title}</div>
      {filtered.length > 0 ? (
        <div className="space-y-0.5">
          {filtered.map((line, i) => (
            <div key={i} className="text-xs text-dark-text truncate">{line}</div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-secondary-text/60 italic">No data</div>
      )}
    </div>
  );
};

const DOC_LABELS = ['Questionnaire', 'Call Transcript', 'Meeting Notes', 'Other'];

const TYPE_BADGE_COLORS = {
  pdf: 'bg-red-100 text-red-700',
  docx: 'bg-blue-100 text-blue-700',
  txt: 'bg-gray-100 text-gray-600',
};

function DocumentCard({ doc, index, onRemove, onLabelChange }) {
  const [expanded, setExpanded] = useState(false);
  const sizeStr = doc.size < 1024 * 1024
    ? `${(doc.size / 1024).toFixed(0)} KB`
    : `${(doc.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <FileText size={20} className="text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-dark-text truncate">{doc.name}</span>
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${TYPE_BADGE_COLORS[doc.type] || TYPE_BADGE_COLORS.txt}`}>
              {doc.type}
            </span>
            <span className="text-xs text-secondary-text">{sizeStr}</span>
          </div>
          <div className="text-xs text-secondary-text mt-0.5">
            {doc.extractedText.length.toLocaleString()} characters extracted
          </div>
        </div>
        <select
          value={doc.label}
          onChange={(e) => onLabelChange(index, e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-aa-blue"
        >
          {DOC_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-aa-blue transition-colors"
          title={expanded ? 'Collapse preview' : 'Expand preview'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={() => onRemove(index)}
          className="p-1 text-gray-300 hover:text-status-red transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className="mt-3 bg-gray-50 rounded p-3 text-xs text-secondary-text font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
          {doc.extractedText.slice(0, 2000)}
          {doc.extractedText.length > 2000 && (
            <span className="text-aa-blue"> ...({(doc.extractedText.length - 2000).toLocaleString()} more characters)</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Initial State ────────────────────────────────────────

const INITIAL = {
  cover: {
    clientName: '', quarter: 'Q1 2026', date: '', jobName: '', jobNumber: '', regionVP: '',
    aaTeam: [{ name: '', title: '' }],
    clientTeam: [{ name: '', title: '' }],
  },
  documents: {
    files: [],
  },
  safety: {
    theme: '', keyTips: '', quickReminders: '', whyItMatters: '',
    incidents: [{ location: '', q1: '', q2: '', q3: '', q4: '' }],
    goodSaves: [{ location: '', hazard: '', action: '', notified: '' }],
    incidentDetails: [{ location: '', date: '', cause: '', treatment: '', returnDate: '' }],
  },
  workTickets: {
    locations: [{ location: '', priorYear: '', currentYear: '' }],
    keyTakeaway: '',
    eventsSupported: '',
  },
  audits: {
    locationNames: ['', '', ''],
    priorAudits: ['', '', ''],
    priorActions: ['', '', ''],
    currentAudits: ['', '', ''],
    currentActions: ['', '', ''],
    auditExplanation: '',
    actionExplanation: '',
    topAreas: [
      { area: 'Restrooms', count: '' }, { area: 'Common Areas', count: '' },
      { area: 'Classrooms', count: '' }, { area: 'Cafeteria', count: '' },
      { area: 'Stairwells', count: '' }, { area: 'Other', count: '' },
    ],
  },
  executive: {
    achievements: ['', '', ''],
    challenges: ['', ''],
    innovations: ['', ''],
  },
  projects: {
    completed: [{ category: 'Renovation/Deep Clean', description: '' }],
    photos: [],
    testimonials: [{ location: '', quote: '', attribution: '' }],
  },
  challenges: {
    items: [{ location: '', challenge: '', action: '' }],
    priorFollowUp: [{ action: '', status: 'In Progress', notes: '' }],
  },
  financial: {
    asOfDate: '', totalOutstanding: '',
    bucket30: '', bucket60: '', bucket90: '', bucket91: '',
    strategyNotes: ['', ''],
  },
  roadmap: {
    highlights: [{ innovation: '', description: '', benefit: '' }],
    photos: [],
    schedule: [
      { month: 'Month 1', initiative: '', details: '' },
      { month: 'Month 2', initiative: '', details: '' },
      { month: 'Month 3', initiative: '', details: '' },
    ],
    goalStatement: '',
  },
};

// ── Tabs ─────────────────────────────────────────────────

const TABS = [
  { key: 'cover', label: 'Cover' },
  { key: 'documents', label: 'Documents' },
  { key: 'safety', label: 'Safety' },
  { key: 'workTickets', label: 'Work Tickets' },
  { key: 'audits', label: 'Audits' },
  { key: 'executive', label: 'Executive' },
  { key: 'projects', label: 'Projects' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'financial', label: 'Financial' },
  { key: 'roadmap', label: 'Innovation' },
];

// ── Project categories ───────────────────────────────────

const PROJECT_CATEGORIES = [
  'Renovation/Deep Clean', 'Grounds', 'Events Supported', 'MEP', 'Other',
];

// ── Main Component ───────────────────────────────────────

export default function QBUBuilder() {
  const [activeTab, setActiveTab] = useState('cover');
  const [form, setForm] = useState(INITIAL);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState(() => getQBUHistory());
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState('upload');
  const [excelFile, setExcelFile] = useState(null);
  const [excelParsed, setExcelParsed] = useState(false);
  const [parseWarnings, setParseWarnings] = useState([]);
  const [populatedCount, setPopulatedCount] = useState(0);
  const [showDataReview, setShowDataReview] = useState(false);
  const toast = useToast();
  const photoInputRef = useRef(null);
  const innovationPhotoInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // ── State updaters ───────────────

  const updateSection = (section, updates) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], ...updates } }));
  };

  const updateArrayRow = (section, field, index, updates) => {
    setForm((prev) => {
      const arr = [...prev[section][field]];
      arr[index] = typeof updates === 'string' ? updates : { ...arr[index], ...updates };
      return { ...prev, [section]: { ...prev[section], [field]: arr } };
    });
  };

  const addArrayRow = (section, field, template) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: [...prev[section][field], template] },
    }));
  };

  const removeArrayRow = (section, field, index) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: prev[section][field].filter((_, i) => i !== index) },
    }));
  };

  // ── Document handling ──────────────

  const docInputRef = useRef(null);

  const handleDocUpload = async (files) => {
    const accepted = Array.from(files).filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc') || ext.endsWith('.txt');
    });
    if (!accepted.length) { toast('Unsupported file type. Use PDF, DOCX, or TXT.', 'error'); return; }

    const newDocs = [];
    for (const file of accepted) {
      try {
        const result = await extractText(file);
        newDocs.push({
          file,
          name: file.name,
          type: result.type,
          size: file.size,
          extractedText: result.text,
          label: file.name.toLowerCase().includes('questionnaire') ? 'Questionnaire'
            : file.name.toLowerCase().includes('transcript') ? 'Call Transcript'
            : 'Other',
        });
      } catch (err) {
        toast(`Failed to extract text from ${file.name}: ${err.message}`, 'error');
      }
    }
    if (newDocs.length) {
      updateSection('documents', { files: [...form.documents.files, ...newDocs] });
      toast(`${newDocs.length} document${newDocs.length > 1 ? 's' : ''} uploaded`);
    }
  };

  const removeDoc = (index) => {
    updateSection('documents', { files: form.documents.files.filter((_, i) => i !== index) });
  };

  const updateDocLabel = (index, label) => {
    const files = [...form.documents.files];
    files[index] = { ...files[index], label };
    updateSection('documents', { files });
  };

  // ── Photo handling ───────────────

  const handlePhotoUpload = (files, section = 'projects') => {
    const newPhotos = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        location: '',
        name: file.name,
        type: 'general',
      }));
    const existing = section === 'roadmap' ? form.roadmap.photos : form.projects.photos;
    updateSection(section, { photos: [...existing, ...newPhotos] });
  };

  const removePhoto = (index, section = 'projects') => {
    const photos = section === 'roadmap' ? form.roadmap.photos : form.projects.photos;
    if (photos[index]?.preview) URL.revokeObjectURL(photos[index].preview);
    updateSection(section, { photos: photos.filter((_, i) => i !== index) });
  };

  const updatePhoto = (index, updates, section = 'projects') => {
    const photos = [...(section === 'roadmap' ? form.roadmap.photos : form.projects.photos)];
    photos[index] = { ...photos[index], ...updates };
    updateSection(section, { photos });
  };

  // ── Excel handling ─────────────

  const handleExcelParse = async (file) => {
    try {
      const { data, warnings, populated } = await parseQBUExcel(file);
      // Merge parsed data into form, preserving documents and photos
      setForm((prev) => ({
        ...prev,
        cover: { ...prev.cover, ...data.cover },
        safety: { ...prev.safety, ...data.safety },
        workTickets: { ...prev.workTickets, ...data.workTickets },
        audits: { ...prev.audits, ...data.audits },
        executive: { ...prev.executive, ...data.executive },
        projects: { ...prev.projects, ...data.projects, photos: prev.projects.photos },
        challenges: { ...prev.challenges, ...data.challenges },
        financial: { ...prev.financial, ...data.financial },
        roadmap: { ...prev.roadmap, ...data.roadmap, photos: prev.roadmap.photos },
        documents: prev.documents,
      }));
      setExcelFile(file);
      setExcelParsed(true);
      setParseWarnings(warnings);
      setPopulatedCount(populated);
      toast(`Excel parsed — ${populated} of 9 sections populated`);
    } catch (err) {
      toast(`Failed to parse Excel: ${err.message}`, 'error');
    }
  };

  const handleExcelDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleExcelParse(file);
    } else {
      toast('Please upload an .xlsx or .xls file', 'error');
    }
  };

  const handleRemoveExcel = () => {
    setExcelFile(null);
    setExcelParsed(false);
    setParseWarnings([]);
    setPopulatedCount(0);
    setShowDataReview(false);
    // Reset form but preserve docs and photos (both sections)
    setForm((prev) => ({
      ...INITIAL,
      documents: prev.documents,
      roadmap: { ...INITIAL.roadmap, photos: prev.roadmap.photos },
      projects: { ...INITIAL.projects, photos: prev.projects.photos },
    }));
    toast('Excel removed — form data cleared');
  };

  // ── Tab navigation ───────────────

  const tabIndex = TABS.findIndex((t) => t.key === activeTab);
  const canPrev = tabIndex > 0;
  const canNext = tabIndex < TABS.length - 1;

  // ── Tab sections ─────────────────

  const renderTab = () => {
    switch (activeTab) {

      // ── COVER & INTROS ──
      case 'cover': return (
        <div className="space-y-6">
          <SectionHeading>Cover Slide</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Client Name</Label><Input value={form.cover.clientName} onChange={(v) => updateSection('cover', { clientName: v })} placeholder="e.g., Greenfield University" /></div>
            <div><Label>Job Name</Label><Input value={form.cover.jobName} onChange={(v) => updateSection('cover', { jobName: v })} placeholder="e.g., Main Campus" /></div>
            <div><Label>Quarter</Label>
              <select value={form.cover.quarter} onChange={(e) => updateSection('cover', { quarter: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white">
                <option>Q1 2026</option><option>Q2 2026</option><option>Q3 2026</option><option>Q4 2026</option>
                <option>Q4 2025</option><option>Q3 2025</option>
              </select>
            </div>
            <div><Label>Date</Label><Input value={form.cover.date} onChange={(v) => updateSection('cover', { date: v })} placeholder="e.g., March 2026" /></div>
            <div><Label>Job Number</Label><Input value={form.cover.jobNumber} onChange={(v) => updateSection('cover', { jobNumber: v })} placeholder="e.g., J-2045" /></div>
            <div><Label>Region VP</Label><Input value={form.cover.regionVP} onChange={(v) => updateSection('cover', { regionVP: v })} placeholder="e.g., Eric Wheeler" /></div>
          </div>

          <SectionHeading>A&A Team Attendees</SectionHeading>
          <div className="space-y-2">
            {form.cover.aaTeam.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={row.name} onChange={(v) => updateArrayRow('cover', 'aaTeam', i, { name: v })} placeholder="Name" className="flex-1" />
                <Input value={row.title} onChange={(v) => updateArrayRow('cover', 'aaTeam', i, { title: v })} placeholder="Title" className="flex-1" />
                {form.cover.aaTeam.length > 1 && <RemoveBtn onClick={() => removeArrayRow('cover', 'aaTeam', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('cover', 'aaTeam', { name: '', title: '' })} label="Add attendee" />
          </div>

          <SectionHeading>Client Team Attendees</SectionHeading>
          <div className="space-y-2">
            {form.cover.clientTeam.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={row.name} onChange={(v) => updateArrayRow('cover', 'clientTeam', i, { name: v })} placeholder="Name" className="flex-1" />
                <Input value={row.title} onChange={(v) => updateArrayRow('cover', 'clientTeam', i, { title: v })} placeholder="Title" className="flex-1" />
                {form.cover.clientTeam.length > 1 && <RemoveBtn onClick={() => removeArrayRow('cover', 'clientTeam', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('cover', 'clientTeam', { name: '', title: '' })} label="Add attendee" />
          </div>
        </div>
      );

      // ── DOCUMENTS ──
      case 'documents': return (
        <div className="space-y-6">
          <SectionHeading description="Upload site manager questionnaires, deck review call transcripts, or meeting notes. The AI agent uses these to write richer, situation-aware narrative content.">
            Supporting Documents
          </SectionHeading>
          <div>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              multiple
              className="hidden"
              onChange={(e) => { handleDocUpload(e.target.files); e.target.value = ''; }}
            />
            <div
              onClick={() => docInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); handleDocUpload(e.dataTransfer.files); }}
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <div className="text-sm font-medium text-dark-text">Drop documents here or click to upload</div>
              <div className="text-xs text-secondary-text mt-1">PDF, DOCX, TXT — questionnaires, call transcripts, meeting notes</div>
            </div>
          </div>

          {form.documents.files.length > 0 && (
            <div className="space-y-3">
              {form.documents.files.map((doc, i) => (
                <DocumentCard key={i} doc={doc} index={i} onRemove={removeDoc} onLabelChange={updateDocLabel} />
              ))}
              <div className="text-xs text-secondary-text">
                {form.documents.files.length} document{form.documents.files.length !== 1 ? 's' : ''} &middot;{' '}
                {form.documents.files.reduce((s, d) => s + d.extractedText.length, 0).toLocaleString()} characters of context for the agent
              </div>
            </div>
          )}
        </div>
      );

      // ── SAFETY ──
      case 'safety': return (
        <div className="space-y-6">
          <SectionHeading description="Theme rotates quarterly: winter prep, slip/fall, PPE, heat illness, ergonomics, chemical safety.">Safety Moment</SectionHeading>
          <div className="space-y-4">
            <div><Label>Theme</Label><Input value={form.safety.theme} onChange={(v) => updateSection('safety', { theme: v })} placeholder="e.g., Slip/Fall Prevention" /></div>
            <div><Label>Key Safety Tips</Label><Area value={form.safety.keyTips} onChange={(v) => updateSection('safety', { keyTips: v })} placeholder="3-4 key tips..." /></div>
            <div><Label>Quick Reminders</Label><Area value={form.safety.quickReminders} onChange={(v) => updateSection('safety', { quickReminders: v })} placeholder="2-3 quick reminders..." rows={2} /></div>
            <div><Label>Why It Matters</Label><Area value={form.safety.whyItMatters} onChange={(v) => updateSection('safety', { whyItMatters: v })} placeholder="Why this theme matters..." rows={2} /></div>
          </div>

          <SectionHeading description="Enter 0 if none. Add rows for additional locations.">Recordable Incidents by Quarter</SectionHeading>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_60px_60px_60px_60px_auto] gap-2 text-[11px] font-semibold text-secondary-text uppercase">
              <span>Location</span><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span className="w-7" />
            </div>
            {form.safety.incidents.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_60px_60px_60px_auto] gap-2 items-center">
                <Input value={row.location} onChange={(v) => updateArrayRow('safety', 'incidents', i, { location: v })} placeholder="Building/area" />
                <Input value={row.q1} onChange={(v) => updateArrayRow('safety', 'incidents', i, { q1: v })} placeholder="0" />
                <Input value={row.q2} onChange={(v) => updateArrayRow('safety', 'incidents', i, { q2: v })} placeholder="0" />
                <Input value={row.q3} onChange={(v) => updateArrayRow('safety', 'incidents', i, { q3: v })} placeholder="0" />
                <Input value={row.q4} onChange={(v) => updateArrayRow('safety', 'incidents', i, { q4: v })} placeholder="0" />
                {form.safety.incidents.length > 1 ? <RemoveBtn onClick={() => removeArrayRow('safety', 'incidents', i)} /> : <div className="w-7" />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('safety', 'incidents', { location: '', q1: '', q2: '', q3: '', q4: '' })} label="Add location" />
          </div>

          <SectionHeading description="Hazards identified and prevented.">Good Saves</SectionHeading>
          <div className="space-y-2">
            {form.safety.goodSaves.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <Input value={row.location} onChange={(v) => updateArrayRow('safety', 'goodSaves', i, { location: v })} placeholder="Location" />
                <Input value={row.hazard} onChange={(v) => updateArrayRow('safety', 'goodSaves', i, { hazard: v })} placeholder="Hazard prevented" />
                <Input value={row.action} onChange={(v) => updateArrayRow('safety', 'goodSaves', i, { action: v })} placeholder="Corrective action" />
                <Input value={row.notified} onChange={(v) => updateArrayRow('safety', 'goodSaves', i, { notified: v })} placeholder="Who notified" />
                {form.safety.goodSaves.length > 1 ? <RemoveBtn onClick={() => removeArrayRow('safety', 'goodSaves', i)} /> : <div className="w-7" />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('safety', 'goodSaves', { location: '', hazard: '', action: '', notified: '' })} label="Add good save" />
          </div>

          <SectionHeading description="For each recordable: location, date, cause, treatment, return-to-work date.">Recordable Incident Details</SectionHeading>
          <div className="space-y-2">
            {form.safety.incidentDetails.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_1fr_1fr_100px_auto] gap-2 items-center">
                <Input value={row.location} onChange={(v) => updateArrayRow('safety', 'incidentDetails', i, { location: v })} placeholder="Location" />
                <Input value={row.date} onChange={(v) => updateArrayRow('safety', 'incidentDetails', i, { date: v })} placeholder="Date" />
                <Input value={row.cause} onChange={(v) => updateArrayRow('safety', 'incidentDetails', i, { cause: v })} placeholder="Description/Cause" />
                <Input value={row.treatment} onChange={(v) => updateArrayRow('safety', 'incidentDetails', i, { treatment: v })} placeholder="Treatment" />
                <Input value={row.returnDate} onChange={(v) => updateArrayRow('safety', 'incidentDetails', i, { returnDate: v })} placeholder="RTW Date" />
                {form.safety.incidentDetails.length > 1 ? <RemoveBtn onClick={() => removeArrayRow('safety', 'incidentDetails', i)} /> : <div className="w-7" />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('safety', 'incidentDetails', { location: '', date: '', cause: '', treatment: '', returnDate: '' })} label="Add incident" />
          </div>
        </div>
      );

      // ── WORK TICKETS ──
      case 'workTickets': return (
        <div className="space-y-6">
          <SectionHeading description="Enter total work orders by location for current quarter and same quarter prior year.">Work Tickets — YoY Comparison</SectionHeading>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_120px_120px_80px_auto] gap-2 text-[11px] font-semibold text-secondary-text uppercase">
              <span>Location</span><span>Prior Year</span><span>Current Year</span><span>% Change</span><span className="w-7" />
            </div>
            {form.workTickets.locations.map((row, i) => {
              const pct = row.priorYear && row.currentYear ? (((Number(row.currentYear) - Number(row.priorYear)) / Number(row.priorYear)) * 100).toFixed(1) : '';
              return (
                <div key={i} className="grid grid-cols-[1fr_120px_120px_80px_auto] gap-2 items-center">
                  <Input value={row.location} onChange={(v) => updateArrayRow('workTickets', 'locations', i, { location: v })} placeholder="Building/area" />
                  <Input value={row.priorYear} onChange={(v) => updateArrayRow('workTickets', 'locations', i, { priorYear: v })} placeholder="0" type="number" />
                  <Input value={row.currentYear} onChange={(v) => updateArrayRow('workTickets', 'locations', i, { currentYear: v })} placeholder="0" type="number" />
                  <div className={`text-sm font-medium px-2 ${pct && Number(pct) < 0 ? 'text-status-green' : pct && Number(pct) > 0 ? 'text-status-red' : 'text-secondary-text'}`}>
                    {pct ? `${Number(pct) > 0 ? '+' : ''}${pct}%` : '—'}
                  </div>
                  {form.workTickets.locations.length > 1 ? <RemoveBtn onClick={() => removeArrayRow('workTickets', 'locations', i)} /> : <div className="w-7" />}
                </div>
              );
            })}
            <AddRowBtn onClick={() => addArrayRow('workTickets', 'locations', { location: '', priorYear: '', currentYear: '' })} label="Add location" />
          </div>

          <div><Label hint="Explain what drove the change">Key Takeaway</Label><Area value={form.workTickets.keyTakeaway} onChange={(v) => updateSection('workTickets', { keyTakeaway: v })} placeholder="e.g., 'Task-based scheduling reduced repeat work orders by 18%'" rows={2} /></div>
          <div><Label>Events Supported</Label><Area value={form.workTickets.eventsSupported} onChange={(v) => updateSection('workTickets', { eventsSupported: v })} placeholder="List events supported this quarter with dates" rows={3} /></div>
        </div>
      );

      // ── AUDITS & ACTIONS ──
      case 'audits': return (
        <div className="space-y-6">
          <SectionHeading description="Enter audit and corrective action counts by location for current and prior quarter.">Audits & Corrective Actions — QoQ</SectionHeading>
          <div>
            <div className="grid grid-cols-[140px_1fr_1fr_1fr_80px] gap-2 text-[11px] font-semibold text-secondary-text uppercase mb-2">
              <span>Metric</span>
              {form.audits.locationNames.map((_, i) => (
                <Input key={i} value={form.audits.locationNames[i]} onChange={(v) => {
                  const names = [...form.audits.locationNames]; names[i] = v;
                  updateSection('audits', { locationNames: names });
                }} placeholder={`Location ${i + 1}`} />
              ))}
              <span className="self-center text-center">Total</span>
            </div>
            {[
              { label: 'Prior Qtr Audits', field: 'priorAudits' },
              { label: 'Prior Qtr Actions', field: 'priorActions' },
              { label: 'Current Qtr Audits', field: 'currentAudits' },
              { label: 'Current Qtr Actions', field: 'currentActions' },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-[140px_1fr_1fr_1fr_80px] gap-2 mb-2 items-center">
                <span className="text-xs text-dark-text font-medium">{label}</span>
                {form.audits[field].map((val, i) => (
                  <Input key={i} value={val} onChange={(v) => {
                    const arr = [...form.audits[field]]; arr[i] = v;
                    updateSection('audits', { [field]: arr });
                  }} placeholder="0" type="number" />
                ))}
                <div className="text-sm font-medium text-center text-dark-text">
                  {form.audits[field].reduce((s, v) => s + (Number(v) || 0), 0)}
                </div>
              </div>
            ))}
          </div>

          <div><Label>Audit Change Explanation</Label><Area value={form.audits.auditExplanation} onChange={(v) => updateSection('audits', { auditExplanation: v })} placeholder="Why did audit counts change?" rows={2} /></div>
          <div><Label>Action Change Explanation</Label><Area value={form.audits.actionExplanation} onChange={(v) => updateSection('audits', { actionExplanation: v })} placeholder="Why did corrective action counts change?" rows={2} /></div>

          <SectionHeading>Top Corrective Action Areas</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {form.audits.topAreas.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-dark-text w-32">{row.area}</span>
                <Input value={row.count} onChange={(v) => updateArrayRow('audits', 'topAreas', i, { count: v })} placeholder="0" type="number" />
              </div>
            ))}
          </div>
        </div>
      );

      // ── EXECUTIVE SUMMARY ──
      case 'executive': return (
        <div className="space-y-6">
          <SectionHeading description="Concrete accomplishments with specifics. Be honest and specific.">Key Achievements (3-5)</SectionHeading>
          <div className="space-y-2">
            {form.executive.achievements.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-secondary-text w-5 shrink-0">{i + 1}.</span>
                <Input value={val} onChange={(v) => updateArrayRow('executive', 'achievements', i, v)} placeholder="Achievement..." />
                {form.executive.achievements.length > 1 && <RemoveBtn onClick={() => removeArrayRow('executive', 'achievements', i)} />}
              </div>
            ))}
            {form.executive.achievements.length < 5 && <AddRowBtn onClick={() => addArrayRow('executive', 'achievements', '')} label="Add achievement" />}
          </div>

          <SectionHeading description="Be honest — spin undermines trust.">Strategic Challenges (2-3)</SectionHeading>
          <div className="space-y-2">
            {form.executive.challenges.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-secondary-text w-5 shrink-0">{i + 1}.</span>
                <Input value={val} onChange={(v) => updateArrayRow('executive', 'challenges', i, v)} placeholder="Challenge..." />
                {form.executive.challenges.length > 1 && <RemoveBtn onClick={() => removeArrayRow('executive', 'challenges', i)} />}
              </div>
            ))}
            {form.executive.challenges.length < 3 && <AddRowBtn onClick={() => addArrayRow('executive', 'challenges', '')} label="Add challenge" />}
          </div>

          <SectionHeading description="Tech deployments, process improvements, equipment additions.">Innovation Milestones (2-5)</SectionHeading>
          <div className="space-y-2">
            {form.executive.innovations.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-secondary-text w-5 shrink-0">{i + 1}.</span>
                <Input value={val} onChange={(v) => updateArrayRow('executive', 'innovations', i, v)} placeholder="Innovation milestone..." />
                {form.executive.innovations.length > 1 && <RemoveBtn onClick={() => removeArrayRow('executive', 'innovations', i)} />}
              </div>
            ))}
            {form.executive.innovations.length < 5 && <AddRowBtn onClick={() => addArrayRow('executive', 'innovations', '')} label="Add milestone" />}
          </div>
        </div>
      );

      // ── PROJECTS & SATISFACTION ──
      case 'projects': return (
        <div className="space-y-6">
          <SectionHeading description="Name buildings, describe what was done. Be specific.">Completed Projects by Category</SectionHeading>
          <div className="space-y-2">
            {form.projects.completed.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={row.category}
                  onChange={(e) => updateArrayRow('projects', 'completed', i, { category: e.target.value })}
                  className="w-48 shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                >
                  {PROJECT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <Input value={row.description} onChange={(v) => updateArrayRow('projects', 'completed', i, { description: v })} placeholder="What was done? Which building?" className="flex-1" />
                {form.projects.completed.length > 1 && <RemoveBtn onClick={() => removeArrayRow('projects', 'completed', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('projects', 'completed', { category: 'Renovation/Deep Clean', description: '' })} label="Add project" />
          </div>

          {/* Photo Upload */}
          <SectionHeading description="Upload photos to include in the QBU deck. Add captions and locations.">Project Photos</SectionHeading>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handlePhotoUpload(e.target.files); e.target.value = ''; }}
            />
            <div
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); handlePhotoUpload(e.dataTransfer.files); }}
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <div className="text-sm font-medium text-dark-text">Drop photos here or click to upload</div>
              <div className="text-xs text-secondary-text mt-1">JPG, PNG — no size limit for prototype</div>
            </div>

            {form.projects.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {form.projects.photos.map((photo, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="relative aspect-video bg-gray-100">
                      <img src={photo.preview} alt={photo.caption || photo.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <Input value={photo.caption} onChange={(v) => updatePhoto(i, { caption: v })} placeholder="Caption" />
                      <Input value={photo.location} onChange={(v) => updatePhoto(i, { location: v })} placeholder="Location / building" />
                      <select
                        value={photo.type || 'general'}
                        onChange={(e) => updatePhoto(i, { type: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                      >
                        <option value="general">General</option>
                        <option value="before">Before</option>
                        <option value="after">After</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SectionHeading description="Direct quotes from emails, texts, or meetings. Attribute by name.">Client Testimonials</SectionHeading>
          <div className="space-y-2">
            {form.projects.testimonials.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input value={row.location} onChange={(v) => updateArrayRow('projects', 'testimonials', i, { location: v })} placeholder="Location" className="w-36 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Area value={row.quote} onChange={(v) => updateArrayRow('projects', 'testimonials', i, { quote: v })} placeholder="Direct quote..." rows={2} />
                  <Input value={row.attribution} onChange={(v) => updateArrayRow('projects', 'testimonials', i, { attribution: v })} placeholder="Name & Title" />
                </div>
                {form.projects.testimonials.length > 1 && <RemoveBtn onClick={() => removeArrayRow('projects', 'testimonials', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('projects', 'testimonials', { location: '', quote: '', attribution: '' })} label="Add testimonial" />
          </div>
        </div>
      );

      // ── CHALLENGES & ACTIONS ──
      case 'challenges': return (
        <div className="space-y-6">
          <SectionHeading description="Recurring issues only — not one-time incidents. Every challenge must have a corresponding action.">Operational Challenges & Actions Taken</SectionHeading>
          <div className="space-y-2">
            {form.challenges.items.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input value={row.location} onChange={(v) => updateArrayRow('challenges', 'items', i, { location: v })} placeholder="Location" className="w-36 shrink-0" />
                <Input value={row.challenge} onChange={(v) => updateArrayRow('challenges', 'items', i, { challenge: v })} placeholder="Challenge (recurring issue)" className="flex-1" />
                <Input value={row.action} onChange={(v) => updateArrayRow('challenges', 'items', i, { action: v })} placeholder="Action taken / planned" className="flex-1" />
                {form.challenges.items.length > 1 && <RemoveBtn onClick={() => removeArrayRow('challenges', 'items', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('challenges', 'items', { location: '', challenge: '', action: '' })} label="Add challenge" />
          </div>

          <SectionHeading description="For actions committed last quarter — report on delivery status.">Prior Quarter Action Follow-Up</SectionHeading>
          <div className="space-y-2">
            {form.challenges.priorFollowUp.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={row.action} onChange={(v) => updateArrayRow('challenges', 'priorFollowUp', i, { action: v })} placeholder="Action item" className="flex-1" />
                <select
                  value={row.status}
                  onChange={(e) => updateArrayRow('challenges', 'priorFollowUp', i, { status: e.target.value })}
                  className="w-36 shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                >
                  <option>Complete</option><option>In Progress</option><option>Not Started</option>
                </select>
                <Input value={row.notes} onChange={(v) => updateArrayRow('challenges', 'priorFollowUp', i, { notes: v })} placeholder="Notes" className="flex-1" />
                {form.challenges.priorFollowUp.length > 1 && <RemoveBtn onClick={() => removeArrayRow('challenges', 'priorFollowUp', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('challenges', 'priorFollowUp', { action: '', status: 'In Progress', notes: '' })} label="Add follow-up" />
          </div>
        </div>
      );

      // ── FINANCIAL ──
      case 'financial': return (
        <div className="space-y-6">
          <SectionHeading>Financial Overview</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>As-of Date</Label><Input value={form.financial.asOfDate} onChange={(v) => updateSection('financial', { asOfDate: v })} placeholder="e.g., Feb 28, 2026" /></div>
            <div><Label>Total Outstanding</Label><Input value={form.financial.totalOutstanding} onChange={(v) => updateSection('financial', { totalOutstanding: v })} placeholder="$0" /></div>
          </div>

          <SectionHeading>Aging Breakdown</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>1-30 Days</Label><Input value={form.financial.bucket30} onChange={(v) => updateSection('financial', { bucket30: v })} placeholder="$0" /></div>
            <div><Label>31-60 Days</Label><Input value={form.financial.bucket60} onChange={(v) => updateSection('financial', { bucket60: v })} placeholder="$0" /></div>
            <div><Label>61-90 Days</Label><Input value={form.financial.bucket90} onChange={(v) => updateSection('financial', { bucket90: v })} placeholder="$0" /></div>
            <div><Label>91+ Days</Label><Input value={form.financial.bucket91} onChange={(v) => updateSection('financial', { bucket91: v })} placeholder="$0" /></div>
          </div>

          <SectionHeading description="AR coordination, disputed items, projections shared, etc.">Financial Strategy Notes</SectionHeading>
          <div className="space-y-2">
            {form.financial.strategyNotes.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-secondary-text w-5 shrink-0">{i + 1}.</span>
                <Input value={val} onChange={(v) => updateArrayRow('financial', 'strategyNotes', i, v)} placeholder="Strategy note..." />
                {form.financial.strategyNotes.length > 1 && <RemoveBtn onClick={() => removeArrayRow('financial', 'strategyNotes', i)} />}
              </div>
            ))}
            {form.financial.strategyNotes.length < 4 && <AddRowBtn onClick={() => addArrayRow('financial', 'strategyNotes', '')} label="Add note" />}
          </div>
        </div>
      );

      // ── INNOVATION & ROADMAP ──
      case 'roadmap': return (
        <div className="space-y-6">
          <SectionHeading description="New tech, equipment, or process improvements. Connect each to an operational benefit.">Innovation & Technology Highlights</SectionHeading>
          <div className="space-y-2">
            {form.roadmap.highlights.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input value={row.innovation} onChange={(v) => updateArrayRow('roadmap', 'highlights', i, { innovation: v })} placeholder="Innovation / Technology" className="w-48 shrink-0" />
                <Input value={row.description} onChange={(v) => updateArrayRow('roadmap', 'highlights', i, { description: v })} placeholder="Description & Results" className="flex-1" />
                <Input value={row.benefit} onChange={(v) => updateArrayRow('roadmap', 'highlights', i, { benefit: v })} placeholder="Operational Benefit" className="flex-1" />
                {form.roadmap.highlights.length > 1 && <RemoveBtn onClick={() => removeArrayRow('roadmap', 'highlights', i)} />}
              </div>
            ))}
            <AddRowBtn onClick={() => addArrayRow('roadmap', 'highlights', { innovation: '', description: '', benefit: '' })} label="Add highlight" />
          </div>

          {/* Innovation Photos */}
          <SectionHeading description="Upload photos of new technology, equipment, or before/after results.">Innovation Photos (optional)</SectionHeading>
          <div>
            <input
              ref={innovationPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handlePhotoUpload(e.target.files, 'roadmap'); e.target.value = ''; }}
            />
            <div
              onClick={() => innovationPhotoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); handlePhotoUpload(e.dataTransfer.files, 'roadmap'); }}
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <div className="text-sm font-medium text-dark-text">Drop photos here or click to upload</div>
              <div className="text-xs text-secondary-text mt-1">JPG, PNG — innovation and technology photos</div>
            </div>

            {form.roadmap.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {form.roadmap.photos.map((photo, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="relative aspect-video bg-gray-100">
                      <img src={photo.preview} alt={photo.caption || photo.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i, 'roadmap')}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <Input value={photo.caption} onChange={(v) => updatePhoto(i, { caption: v }, 'roadmap')} placeholder="Caption" />
                      <Input value={photo.location} onChange={(v) => updatePhoto(i, { location: v }, 'roadmap')} placeholder="Location / building" />
                      <select
                        value={photo.type || 'general'}
                        onChange={(e) => updatePhoto(i, { type: e.target.value }, 'roadmap')}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                      >
                        <option value="general">General</option>
                        <option value="before">Before</option>
                        <option value="after">After</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SectionHeading description="Concrete operational items — not vague goals. This becomes the outline for the next QBU.">Next Quarter Roadmap</SectionHeading>
          <div className="space-y-2">
            {form.roadmap.schedule.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-secondary-text w-16 shrink-0 font-medium">{row.month}</span>
                <Input value={row.initiative} onChange={(v) => updateArrayRow('roadmap', 'schedule', i, { initiative: v })} placeholder="Initiative" className="flex-1" />
                <Input value={row.details} onChange={(v) => updateArrayRow('roadmap', 'schedule', i, { details: v })} placeholder="Details" className="flex-1" />
              </div>
            ))}
          </div>

          <div><Label hint="One sentence summarizing the quarter's targets">Quarter Goal Statement</Label><Area value={form.roadmap.goalStatement} onChange={(v) => updateSection('roadmap', { goalStatement: v })} placeholder="e.g., 'Achieve 92% task completion, zero snow SLA misses, complete restroom renovation in Building C'" rows={2} /></div>
        </div>
      );

      default: return null;
    }
  };

  // ── Generate ─────────────────────

  const handleGenerate = async () => {
    if (!form.cover.clientName) { toast('Please enter a client name on the Cover tab', 'error'); return; }
    setGenerating(true);
    try {
      const output = await callAgent('qbu', 'generateQBU', form);
      setResult(output);
      setShowResult(true);
      saveQBU({
        client: form.cover.clientName,
        quarter: form.cover.quarter,
        jobName: form.cover.jobName || '',
        formData: form,
        agentOutput: output,
      });
      setHistory(getQBUHistory());
      toast('QBU generated and saved');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) { toast('Generate QBU first', 'error'); return; }
    toast('Building PowerPoint...');
    await generateQBUPptx(form, result);
    toast('PPTX downloaded');
  };

  const handleLoadQBU = (id) => {
    const entry = getQBUById(id);
    if (!entry) return;
    setForm({ ...INITIAL, ...entry.formData, projects: { ...entry.formData.projects, photos: entry.formData.projects?.photos || [] }, roadmap: { ...entry.formData.roadmap, photos: entry.formData.roadmap?.photos || [] } });
    setResult(entry.agentOutput);
    setShowResult(true);
    setActiveTab('cover');
    toast(`Loaded: ${entry.client} ${entry.quarter}`);
  };

  const handleRedownload = async (id) => {
    const entry = getQBUById(id);
    if (!entry) return;
    toast('Building PowerPoint...');
    await generateQBUPptx(entry.formData, entry.agentOutput);
    toast('PPTX downloaded');
  };

  const handleDeleteQBU = (id, client) => {
    if (!confirm(`Delete QBU for ${client}?`)) return;
    deleteQBU(id);
    setHistory(getQBUHistory());
    toast('QBU deleted');
  };

  // ── Render ───────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-light text-dark-text">QBU Builder</h1>
        <div className="flex items-center gap-2">
          {excelParsed && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
              <FileSpreadsheet size={12} /> Excel loaded
            </span>
          )}
          {form.documents.files.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-secondary-text bg-gray-100 px-2 py-1 rounded">
              <FileText size={12} /> {form.documents.files.length} doc{form.documents.files.length !== 1 ? 's' : ''}
            </span>
          )}
          {(form.projects.photos.length + form.roadmap.photos.length) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-secondary-text bg-gray-100 px-2 py-1 rounded">
              <Image size={12} /> {form.projects.photos.length + form.roadmap.photos.length} photo{(form.projects.photos.length + form.roadmap.photos.length) !== 1 ? 's' : ''}
            </span>
          )}
          <AgentActionButton label="Generate QBU" variant="primary" onClick={handleGenerate} />
        </div>
      </div>
      <p className="text-sm text-secondary-text mb-4">
        {mode === 'upload'
          ? 'Upload your completed Excel intake template, attach supporting docs, and generate.'
          : 'Complete the intake form below. The AI agent will compile all sections into a branded QBU deck.'}
      </p>

      {/* Mode toggle */}
      <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setMode('upload')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'upload' ? 'bg-white text-dark-text shadow-sm' : 'text-secondary-text hover:text-dark-text'
          }`}
        >
          <Upload size={14} /> Upload
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'manual' ? 'bg-white text-dark-text shadow-sm' : 'text-secondary-text hover:text-dark-text'
          }`}
        >
          <FileBarChart size={14} /> Manual
        </button>
      </div>

      {mode === 'upload' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 space-y-0">
          {/* Section 1: Excel Upload */}
          <SectionHeading description="Upload your completed qbu-intake-template.xlsx. Data will be parsed into all form sections.">
            Excel Intake Template
          </SectionHeading>

          {!excelParsed ? (
            <>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { if (e.target.files[0]) handleExcelParse(e.target.files[0]); e.target.value = ''; }}
              />
              <div
                onClick={() => excelInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
                onDrop={handleExcelDrop}
                className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
              >
                <FileSpreadsheet size={24} className="mx-auto text-gray-400 mb-2" />
                <div className="text-sm font-medium text-dark-text">Drop Excel template here or click to upload</div>
                <div className="text-xs text-secondary-text mt-1">.xlsx or .xls — qbu-intake-template</div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={20} className="text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark-text truncate">{excelFile.name}</div>
                    <div className="text-xs text-secondary-text mt-0.5">
                      Parsed successfully — {populatedCount} of 9 sections populated
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDataReview(!showDataReview)}
                    className="text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors whitespace-nowrap"
                  >
                    {showDataReview ? 'Hide Data' : 'Review Data'}
                  </button>
                  <button
                    onClick={handleRemoveExcel}
                    className="p-1 text-gray-300 hover:text-status-red transition-colors"
                    title="Remove Excel"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {parseWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 mb-1">
                    <AlertTriangle size={12} /> {parseWarnings.length} warning{parseWarnings.length !== 1 ? 's' : ''}
                  </div>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    {parseWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              )}

              {showDataReview && (
                <div className="grid grid-cols-2 gap-3">
                  <ReviewSection title="Cover" lines={[
                    form.cover.clientName && `Client: ${form.cover.clientName}`,
                    form.cover.quarter && `Quarter: ${form.cover.quarter}`,
                    form.cover.jobName && `Job: ${form.cover.jobName}`,
                    form.cover.aaTeam.filter((t) => t.name).length > 0 && `A&A Team: ${form.cover.aaTeam.filter((t) => t.name).length} attendees`,
                  ]} />
                  <ReviewSection title="Safety" lines={[
                    form.safety.theme && `Theme: ${form.safety.theme}`,
                    form.safety.incidents.filter((r) => r.location).length > 0 && `${form.safety.incidents.filter((r) => r.location).length} incident locations`,
                    form.safety.goodSaves.filter((r) => r.location).length > 0 && `${form.safety.goodSaves.filter((r) => r.location).length} good saves`,
                  ]} />
                  <ReviewSection title="Work Tickets" lines={[
                    form.workTickets.locations.filter((r) => r.location).length > 0 && `${form.workTickets.locations.filter((r) => r.location).length} locations`,
                    form.workTickets.keyTakeaway && `Takeaway: ${form.workTickets.keyTakeaway.slice(0, 60)}...`,
                  ]} />
                  <ReviewSection title="Audits" lines={[
                    form.audits.locationNames.filter(Boolean).length > 0 && `Locations: ${form.audits.locationNames.filter(Boolean).join(', ')}`,
                    form.audits.auditExplanation && `Explanation provided`,
                  ]} />
                  <ReviewSection title="Executive" lines={[
                    form.executive.achievements.filter(Boolean).length > 0 && `${form.executive.achievements.filter(Boolean).length} achievements`,
                    form.executive.challenges.filter(Boolean).length > 0 && `${form.executive.challenges.filter(Boolean).length} challenges`,
                    form.executive.innovations.filter(Boolean).length > 0 && `${form.executive.innovations.filter(Boolean).length} innovations`,
                  ]} />
                  <ReviewSection title="Projects" lines={[
                    form.projects.completed.filter((r) => r.description).length > 0 && `${form.projects.completed.filter((r) => r.description).length} projects`,
                    form.projects.testimonials.filter((r) => r.quote).length > 0 && `${form.projects.testimonials.filter((r) => r.quote).length} testimonials`,
                  ]} />
                  <ReviewSection title="Challenges" lines={[
                    form.challenges.items.filter((r) => r.challenge).length > 0 && `${form.challenges.items.filter((r) => r.challenge).length} challenges`,
                    form.challenges.priorFollowUp.filter((r) => r.action).length > 0 && `${form.challenges.priorFollowUp.filter((r) => r.action).length} follow-ups`,
                  ]} />
                  <ReviewSection title="Financial" lines={[
                    form.financial.totalOutstanding && `Outstanding: ${form.financial.totalOutstanding}`,
                    form.financial.asOfDate && `As of: ${form.financial.asOfDate}`,
                  ]} />
                  <ReviewSection title="Innovation & Roadmap" lines={[
                    form.roadmap.highlights.filter((r) => r.innovation).length > 0 && `${form.roadmap.highlights.filter((r) => r.innovation).length} highlights`,
                    form.roadmap.goalStatement && `Goal: ${form.roadmap.goalStatement.slice(0, 60)}...`,
                  ]} />
                </div>
              )}
            </div>
          )}

          {/* Section 2: Supporting Documents */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <SectionHeading description="Upload questionnaires, call transcripts, or meeting notes. The AI agent uses these to write richer narrative content.">
              Supporting Documents
            </SectionHeading>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              multiple
              className="hidden"
              onChange={(e) => { handleDocUpload(e.target.files); e.target.value = ''; }}
            />
            <div
              onClick={() => docInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); handleDocUpload(e.dataTransfer.files); }}
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
            >
              <Upload size={20} className="mx-auto text-gray-400 mb-1.5" />
              <div className="text-sm font-medium text-dark-text">Drop documents here or click to upload</div>
              <div className="text-xs text-secondary-text mt-1">PDF, DOCX, TXT — questionnaires, call transcripts, meeting notes</div>
            </div>

            {form.documents.files.length > 0 && (
              <div className="space-y-3 mt-4">
                {form.documents.files.map((doc, i) => (
                  <DocumentCard key={i} doc={doc} index={i} onRemove={removeDoc} onLabelChange={updateDocLabel} />
                ))}
                <div className="text-xs text-secondary-text">
                  {form.documents.files.length} document{form.documents.files.length !== 1 ? 's' : ''} &middot;{' '}
                  {form.documents.files.reduce((s, d) => s + d.extractedText.length, 0).toLocaleString()} characters of context
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Project Photos */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <SectionHeading description="Upload photos to include in the QBU deck. Add captions, locations, and before/after tags.">
              Project Photos (Optional)
            </SectionHeading>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handlePhotoUpload(e.target.files); e.target.value = ''; }}
            />
            <div
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); handlePhotoUpload(e.dataTransfer.files); }}
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
            >
              <Image size={20} className="mx-auto text-gray-400 mb-1.5" />
              <div className="text-sm font-medium text-dark-text">Drop photos here or click to upload</div>
              <div className="text-xs text-secondary-text mt-1">JPG, PNG — project photos for the deck</div>
            </div>

            {form.projects.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {form.projects.photos.map((photo, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="relative aspect-video bg-gray-100">
                      <img src={photo.preview} alt={photo.caption || photo.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <Input value={photo.caption} onChange={(v) => updatePhoto(i, { caption: v })} placeholder="Caption" />
                      <Input value={photo.location} onChange={(v) => updatePhoto(i, { location: v })} placeholder="Location / building" />
                      <select
                        value={photo.type || 'general'}
                        onChange={(e) => updatePhoto(i, { type: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                      >
                        <option value="general">General</option>
                        <option value="before">Before</option>
                        <option value="after">After</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Innovation Photos */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <SectionHeading description="Upload photos of new technology, equipment, or before/after results.">
              Innovation Photos (Optional)
            </SectionHeading>
            <input
              ref={innovationPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handlePhotoUpload(e.target.files, 'roadmap'); e.target.value = ''; }}
            />
            <div
              onClick={() => innovationPhotoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-aa-blue', 'bg-aa-blue/5'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-aa-blue', 'bg-aa-blue/5'); handlePhotoUpload(e.dataTransfer.files, 'roadmap'); }}
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-aa-blue hover:bg-aa-blue/5 transition-colors"
            >
              <Image size={20} className="mx-auto text-gray-400 mb-1.5" />
              <div className="text-sm font-medium text-dark-text">Drop photos here or click to upload</div>
              <div className="text-xs text-secondary-text mt-1">JPG, PNG — innovation and technology photos</div>
            </div>

            {form.roadmap.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {form.roadmap.photos.map((photo, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="relative aspect-video bg-gray-100">
                      <img src={photo.preview} alt={photo.caption || photo.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i, 'roadmap')}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <Input value={photo.caption} onChange={(v) => updatePhoto(i, { caption: v }, 'roadmap')} placeholder="Caption" />
                      <Input value={photo.location} onChange={(v) => updatePhoto(i, { location: v }, 'roadmap')} placeholder="Location / building" />
                      <select
                        value={photo.type || 'general'}
                        onChange={(e) => updatePhoto(i, { type: e.target.value }, 'roadmap')}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                      >
                        <option value="general">General</option>
                        <option value="before">Before</option>
                        <option value="after">After</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="border-t border-gray-200 pt-6 mt-6 flex justify-end">
            <AgentActionButton label="Generate QBU" variant="primary" onClick={handleGenerate} />
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <>
          {/* Tab nav */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-aa-blue border-aa-blue'
                    : 'text-secondary-text border-transparent hover:text-dark-text hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form content */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            {renderTab()}
          </div>

          {/* Tab navigation footer */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => canPrev && setActiveTab(TABS[tabIndex - 1].key)}
              disabled={!canPrev}
              className="inline-flex items-center gap-1 text-sm font-medium text-secondary-text hover:text-dark-text transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronLeft size={16} /> {canPrev ? TABS[tabIndex - 1].label : 'Previous'}
            </button>
            <span className="text-xs text-secondary-text">{tabIndex + 1} of {TABS.length}</span>
            {canNext ? (
              <button
                onClick={() => setActiveTab(TABS[tabIndex + 1].key)}
                className="inline-flex items-center gap-1 text-sm font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
              >
                {TABS[tabIndex + 1].label} <ChevronRight size={16} />
              </button>
            ) : (
              <AgentActionButton label="Generate QBU" variant="primary" onClick={handleGenerate} />
            )}
          </div>
        </>
      )}

      {/* Generated result */}
      {showResult && result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider">Generated QBU Content</div>
            <div className="flex items-center gap-3">
              <button onClick={handleDownload} className="inline-flex items-center gap-1 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors">
                <Download size={12} /> Download PPTX
              </button>
              <button onClick={() => setShowResult(false)} className="text-xs text-secondary-text hover:text-dark-text transition-colors">Hide</button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-dark-text leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
            {result}
          </div>
        </div>
      )}

      {/* Recent QBUs */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">Recent QBUs</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-secondary-text">
            <Clock size={20} className="mx-auto mb-2 text-gray-300" />
            No QBUs generated yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Job Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Quarter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-dark-text cursor-pointer" onClick={() => handleLoadQBU(r.id)}>{r.client}</td>
                  <td className="px-4 py-3 text-secondary-text cursor-pointer" onClick={() => handleLoadQBU(r.id)}>{r.jobName || '—'}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => handleLoadQBU(r.id)}>{r.quarter}</td>
                  <td className="px-4 py-3 text-secondary-text cursor-pointer" onClick={() => handleLoadQBU(r.id)}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => handleLoadQBU(r.id)}><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleLoadQBU(r.id)} title="Load QBU" className="p-1.5 text-gray-400 hover:text-aa-blue transition-colors rounded">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={() => handleRedownload(r.id)} title="Download PPTX" className="p-1.5 text-gray-400 hover:text-aa-blue transition-colors rounded">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleDeleteQBU(r.id, r.client)} title="Delete" className="p-1.5 text-gray-400 hover:text-status-red transition-colors rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
