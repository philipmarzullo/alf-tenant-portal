import { useState, useRef } from 'react';
import { FileBarChart, Plus, Trash2, Upload, X, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import AgentActionButton from '../../components/shared/AgentActionButton';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';

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

// ── Initial State ────────────────────────────────────────

const INITIAL = {
  cover: {
    clientName: '', quarter: 'Q1 2026', date: '', jobName: '', jobNumber: '', regionVP: '',
    aaTeam: [{ name: '', title: '' }],
    clientTeam: [{ name: '', title: '' }],
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
  { key: 'safety', label: 'Safety' },
  { key: 'workTickets', label: 'Work Tickets' },
  { key: 'audits', label: 'Audits' },
  { key: 'executive', label: 'Executive' },
  { key: 'projects', label: 'Projects' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'financial', label: 'Financial' },
  { key: 'roadmap', label: 'Innovation' },
];

// ── Recent QBUs ──────────────────────────────────────────

const RECENT = [
  { id: 1, client: 'Greenfield University', quarter: 'Q4 2025', created: 'Dec 15, 2025', status: 'complete' },
  { id: 2, client: 'Fordham University', quarter: 'Q4 2025', created: 'Dec 18, 2025', status: 'complete' },
  { id: 3, client: 'Mount Sinai Health System', quarter: 'Q4 2025', created: 'Jan 5, 2026', status: 'complete' },
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
  const toast = useToast();
  const photoInputRef = useRef(null);

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

  // ── Photo handling ───────────────

  const handlePhotoUpload = (files) => {
    const newPhotos = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        location: '',
        name: file.name,
      }));
    updateSection('projects', { photos: [...form.projects.photos, ...newPhotos] });
  };

  const removePhoto = (index) => {
    const photo = form.projects.photos[index];
    if (photo.preview) URL.revokeObjectURL(photo.preview);
    updateSection('projects', { photos: form.projects.photos.filter((_, i) => i !== index) });
  };

  const updatePhoto = (index, updates) => {
    const photos = [...form.projects.photos];
    photos[index] = { ...photos[index], ...updates };
    updateSection('projects', { photos });
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
    const output = await callAgent('qbu', 'generateQBU', form);
    setResult(output);
    setShowResult(true);
    toast('QBU content generated');
  };

  // ── Render ───────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-light text-dark-text">QBU Builder</h1>
        <div className="flex items-center gap-2">
          {form.projects.photos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-secondary-text bg-gray-100 px-2 py-1 rounded">
              <Image size={12} /> {form.projects.photos.length} photo{form.projects.photos.length !== 1 ? 's' : ''}
            </span>
          )}
          <AgentActionButton label="Generate QBU" variant="primary" onClick={handleGenerate} />
        </div>
      </div>
      <p className="text-sm text-secondary-text mb-6">
        Complete the intake form below. The AI agent will compile all sections into a branded QBU deck.
      </p>

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

      {/* Generated result */}
      {showResult && result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider">Generated QBU Content</div>
            <button onClick={() => setShowResult(false)} className="text-xs text-secondary-text hover:text-dark-text transition-colors">Hide</button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-dark-text leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
            {result}
          </div>
        </div>
      )}

      {/* Recent QBUs */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">Recent QBUs</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Quarter</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {RECENT.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-dark-text">{r.client}</td>
                <td className="px-4 py-3">{r.quarter}</td>
                <td className="px-4 py-3 text-secondary-text">{r.created}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
