import { useState, useEffect } from 'react';
import { Presentation, ChevronDown, ChevronUp, Plus, Trash2, Bot, Download, Clock } from 'lucide-react';
import AgentActionButton from '../../components/shared/AgentActionButton';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';
import { generateSalesDeckPptx } from '../../utils/salesDeckPptxTemplate';
import { useBranding } from '../../contexts/BrandingContext';
import { supabase } from '../../lib/supabase';

const VERTICALS = [
  'Education — Higher Ed',
  'Education — K-12',
  'Healthcare — Hospital / Health System',
  'Healthcare — Outpatient / Clinic',
  'Life Sciences / Pharma',
  'Commercial Office',
  'Government — Federal',
  'Government — State / Municipal',
  'Industrial / Manufacturing',
  'Residential — Multi-Family',
  'Hospitality',
  'Aviation / Transportation',
  'Retail',
  'Sports & Entertainment',
];

const SERVICE_OPTIONS = [
  'Janitorial — Day Porter',
  'Janitorial — Nightly Cleaning',
  'Janitorial — Deep Clean / Periodic',
  'Janitorial — Event Support',
  'Grounds — Landscaping',
  'Grounds — Snow & Ice Removal',
  'Grounds — Athletic Fields',
  'MEP — Preventive Maintenance',
  'MEP — Emergency Response',
  'MEP — Building Systems Management',
  'Integrated Services (Multi-Trade)',
];

const FACILITY_TYPES = [
  'Single Building',
  'Multi-Building Campus',
  'High-Rise Tower',
  'Hospital / Clinical',
  'Research / Lab',
  'Distribution / Warehouse',
  'Mixed-Use',
  'Athletic / Recreation',
  'Residential Complex',
];

const EMPTY_FORM = {
  // Prospect info
  companyName: '',
  siteName: '',
  vertical: '',
  facilityType: '',
  approxSqft: '',
  // Presentation audience
  presentingTo: [{ name: '', title: '' }],
  presentationDate: '',
  // A&A team
  aaTeam: [{ name: '', title: '' }],
  // Scope
  servicesRequested: [],
  // Challenges & context
  currentProvider: '',
  reasonForChange: '',
  challenges: '',
  specialRequirements: '',
  // Differentiators to emphasize
  emphasisAreas: [],
};

const EMPHASIS_OPTIONS = [
  { key: 'retention', label: '98%+ Client Retention' },
  { key: 'esop', label: 'Employee-Owned (ESOP)' },
  { key: 'peoplefirst', label: 'Core Operating Philosophy' },
  { key: 'technology', label: 'Technology Platform' },
  { key: 'glidepath', label: 'Shared Savings Model' },
  { key: 'union', label: 'Union Workforce Expertise' },
  { key: 'complex', label: 'Complex Environment Experience' },
  { key: 'manager', label: 'Manager-Heavy Model' },
];

function CollapsibleSection({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left"
      >
        <div>
          <div className="text-sm font-semibold text-dark-text">{title}</div>
          {subtitle && <div className="text-xs text-secondary-text mt-0.5">{subtitle}</div>}
        </div>
        {open ? <ChevronUp size={16} className="text-secondary-text" /> : <ChevronDown size={16} className="text-secondary-text" />}
      </button>
      {open && <div className="px-5 py-4 border-t border-gray-200 bg-white">{children}</div>}
    </div>
  );
}

export default function SalesDeckBuilder() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [recentProposals, setRecentProposals] = useState([]);
  const toast = useToast();
  const brand = useBranding();

  useEffect(() => {
    const tenantId = import.meta.env.VITE_TENANT_ID;
    if (!tenantId) return;
    supabase
      .from('tool_submissions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('tool_key', 'salesDeck')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecentProposals(data || []));
  }, []);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addPerson = (key) => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], { name: '', title: '' }] }));
  };

  const updatePerson = (key, idx, field, value) => {
    setForm((prev) => {
      const updated = [...prev[key]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [key]: updated };
    });
  };

  const removePerson = (key, idx) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const toggleService = (svc) => {
    setForm((prev) => ({
      ...prev,
      servicesRequested: prev.servicesRequested.includes(svc)
        ? prev.servicesRequested.filter((s) => s !== svc)
        : [...prev.servicesRequested, svc],
    }));
  };

  const toggleEmphasis = (key) => {
    setForm((prev) => ({
      ...prev,
      emphasisAreas: prev.emphasisAreas.includes(key)
        ? prev.emphasisAreas.filter((k) => k !== key)
        : [...prev.emphasisAreas, key],
    }));
  };

  const handleGenerate = async () => {
    if (!form.companyName.trim()) {
      toast('Please enter a company name', 'error');
      return;
    }
    const emphasisLabels = EMPHASIS_OPTIONS
      .filter((o) => form.emphasisAreas.includes(o.key))
      .map((o) => o.label);

    const output = await callAgent('salesDeck', 'generateDeck', {
      prospect: form.companyName,
      site: form.siteName,
      industry: form.vertical,
      facilityType: form.facilityType,
      approxSqft: form.approxSqft,
      presentingTo: form.presentingTo.filter((p) => p.name).map((p) => `${p.name}, ${p.title}`).join('; '),
      presentationDate: form.presentationDate,
      aaTeam: form.aaTeam.filter((p) => p.name).map((p) => `${p.name}, ${p.title}`).join('; '),
      servicesRequested: form.servicesRequested.join(', '),
      currentProvider: form.currentProvider,
      reasonForChange: form.reasonForChange,
      concerns: form.challenges,
      specialRequirements: form.specialRequirements,
      emphasisAreas: emphasisLabels.join(', '),
    });
    setResult(output);
    toast('Proposal content generated');

    // Persist to tool_submissions
    const tenantId = import.meta.env.VITE_TENANT_ID;
    if (tenantId) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: saved } = await supabase.from('tool_submissions').insert({
        tenant_id: tenantId,
        tool_key: 'salesDeck',
        title: `${form.companyName} — ${form.siteName || 'General'}`,
        form_data: form,
        agent_output: output,
        status: 'complete',
        created_by: user?.id || null,
      }).select().single();
      if (saved) setRecentProposals((prev) => [saved, ...prev]);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setResult(null);
  };

  const handleDownload = async () => {
    if (!result) { toast('Generate a sales deck first', 'error'); return; }
    toast('Building PowerPoint...');
    await generateSalesDeckPptx(form, result, brand);
    toast('PPTX downloaded');
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
        <h1 className="text-2xl font-light text-dark-text">Proposal Builder</h1>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <Bot size={16} />
          Ask Proposal Agent
        </button>
      </div>
      <p className="text-sm text-secondary-text mb-6">
        Build prospect-specific sales presentation content. Fill in as much detail as possible — the more context, the more tailored the output.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left: Intake Form */}
        <div className="md:col-span-3 space-y-3">
          {/* Section 1: Prospect Info */}
          <CollapsibleSection title="Prospect Information" subtitle="Company, site, and industry details" defaultOpen>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Company Name *</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="e.g., Greenfield University"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Site / Location Name</label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => updateField('siteName', e.target.value)}
                  placeholder="e.g., Main Campus"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Vertical / Industry *</label>
                  <select
                    value={form.vertical}
                    onChange={(e) => updateField('vertical', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                  >
                    <option value="">Select vertical...</option>
                    {VERTICALS.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Facility Type</label>
                  <select
                    value={form.facilityType}
                    onChange={(e) => updateField('facilityType', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                  >
                    <option value="">Select type...</option>
                    {FACILITY_TYPES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Approx. Square Footage</label>
                <input
                  type="text"
                  value={form.approxSqft}
                  onChange={(e) => updateField('approxSqft', e.target.value)}
                  placeholder="e.g., 1.2M sqft"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 2: Presentation Audience */}
          <CollapsibleSection title="Presentation Audience" subtitle="Who are we presenting to?">
            <div className="space-y-3">
              {form.presentingTo.map((person, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => updatePerson('presentingTo', i, 'name', e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                    />
                    <input
                      type="text"
                      value={person.title}
                      onChange={(e) => updatePerson('presentingTo', i, 'title', e.target.value)}
                      placeholder="Title (e.g., VP Facilities)"
                      className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                    />
                  </div>
                  {form.presentingTo.length > 1 && (
                    <button onClick={() => removePerson('presentingTo', i)} className="p-2 text-gray-400 hover:text-status-red transition-colors mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPerson('presentingTo')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
              >
                <Plus size={12} /> Add person
              </button>
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Presentation Date</label>
                <input
                  type="date"
                  value={form.presentationDate}
                  onChange={(e) => updateField('presentationDate', e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 3: A&A Team */}
          <CollapsibleSection title="Presenting Team" subtitle="Who is presenting?">
            <div className="space-y-3">
              {form.aaTeam.map((person, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => updatePerson('aaTeam', i, 'name', e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                    />
                    <input
                      type="text"
                      value={person.title}
                      onChange={(e) => updatePerson('aaTeam', i, 'title', e.target.value)}
                      placeholder="Title (e.g., VP Sales)"
                      className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                    />
                  </div>
                  {form.aaTeam.length > 1 && (
                    <button onClick={() => removePerson('aaTeam', i)} className="p-2 text-gray-400 hover:text-status-red transition-colors mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addPerson('aaTeam')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
              >
                <Plus size={12} /> Add team member
              </button>
            </div>
          </CollapsibleSection>

          {/* Section 4: Scope of Services */}
          <CollapsibleSection title="Scope of Services" subtitle="What services is the prospect looking for?">
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((svc) => (
                <label key={svc} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.servicesRequested.includes(svc)}
                    onChange={() => toggleService(svc)}
                    className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                  />
                  <span className="text-sm text-dark-text group-hover:text-aa-blue transition-colors">{svc}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* Section 5: Challenges & Context */}
          <CollapsibleSection title="Challenges & Current Situation" subtitle="What problems are they trying to solve?" defaultOpen>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Current Provider</label>
                  <input
                    type="text"
                    value={form.currentProvider}
                    onChange={(e) => updateField('currentProvider', e.target.value)}
                    placeholder="e.g., ABM, Cushman & Wakefield"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-text mb-1">Reason for Change</label>
                  <select
                    value={form.reasonForChange}
                    onChange={(e) => updateField('reasonForChange', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
                  >
                    <option value="">Select...</option>
                    <option>Service quality issues</option>
                    <option>Contract expiring — exploring options</option>
                    <option>Cost concerns</option>
                    <option>Staffing / turnover problems</option>
                    <option>Lack of technology / reporting</option>
                    <option>New facility — first-time outsourcing</option>
                    <option>Management responsiveness</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Key Challenges & Pain Points *</label>
                <textarea
                  value={form.challenges}
                  onChange={(e) => updateField('challenges', e.target.value)}
                  placeholder="What specific problems is the prospect experiencing? What do they want to be different with a new provider? Be as specific as possible — this drives the deck's messaging."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-text mb-1">Special Requirements or Notes</label>
                <textarea
                  value={form.specialRequirements}
                  onChange={(e) => updateField('specialRequirements', e.target.value)}
                  placeholder="e.g., Union environment, LEED-certified building, 24/7 operations, security clearance required, specific compliance needs..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 6: Emphasis Areas */}
          <CollapsibleSection title="Differentiators to Emphasize" subtitle="Which company strengths should the proposal highlight?">
            <div className="grid grid-cols-2 gap-2">
              {EMPHASIS_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.emphasisAreas.includes(opt.key)}
                    onChange={() => toggleEmphasis(opt.key)}
                    className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                  />
                  <span className="text-sm text-dark-text group-hover:text-aa-blue transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <AgentActionButton label="Generate Proposal" variant="primary" onClick={handleGenerate} />
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Form
            </button>
          </div>
        </div>

        {/* Right: Output + Recent */}
        <div className="md:col-span-2 space-y-6">
          {result ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider">Generated Content</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
                  >
                    <Download size={12} /> Download PPTX
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(result); toast('Copied to clipboard'); }}
                    className="text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
                  >
                    Copy All
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-dark-text leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {result}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
              <Presentation size={32} className="text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-medium text-dark-text mb-1">No proposal generated yet</div>
              <div className="text-xs text-secondary-text">
                Fill in the intake form and click "Generate Proposal" to create prospect-specific presentation content.
              </div>
            </div>
          )}

          {/* Recent proposals */}
          <div>
            <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">Recent Proposals</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              {recentProposals.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-secondary-text">
                  <Clock size={20} className="mx-auto mb-2 text-gray-300" />
                  No proposal generated yet
                </div>
              ) : (
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Prospect</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Industry</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProposals.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-medium text-dark-text">{r.form_data?.companyName || r.title || 'Untitled'}</td>
                        <td className="px-4 py-3 text-secondary-text text-xs">{r.form_data?.vertical || '—'}</td>
                        <td className="px-4 py-3 text-secondary-text text-xs">
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status || 'complete'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="salesDeck"
        agentName="Proposal Agent"
        context="Sales presentation strategy, competitive positioning, prospect messaging, and company differentiators"
      />
    </div>
  );
}
