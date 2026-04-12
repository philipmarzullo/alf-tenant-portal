// src/pages/ops/VPReportTab.jsx
// VP Quarterly Performance Report — form + auto-data + Claude-generated report

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FileText, RefreshCw, Copy, Download, Printer,
  Users, ClipboardList, DollarSign, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import { callAgent } from '../../agents/api';

// ─── Default form state ────────────────────────────────────────────────────────

const defaultInputs = () => ({
  // Executive Summary
  status: '',
  keyChanges: ['', '', ''],
  vpTakeaway: '',
  // Strategic Initiatives
  initiatives: [
    { name: '', status: '', impact: '' },
    { name: '', status: '', impact: '' },
    { name: '', status: '', impact: '' },
  ],
  // Client Health
  escalations: '',
  contractsAtRisk: '',
  contractsForRenewal: '',
  // Safety Notes
  highRiskContext: '',
  trainingActivities: '',
  // Next Quarter Priorities
  priority1: '',
  priority2: '',
  priority3: '',
  decisionsNeeded: '',
  keyRisks: '',
  // Additional Notes
  additionalNotes: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmt(val, type = 'number') {
  if (val === null || val === undefined) return '—';
  if (type === 'pct') return `${val}%`;
  if (type === 'currency') return `$${Number(val).toLocaleString()}`;
  if (type === 'integer') return Number(val).toLocaleString();
  return String(val);
}

function storageKey(vp, tenantId) {
  return `vp-report-inputs-${vp}-${tenantId}`;
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    'On Track': 'bg-[#EAF3DE] text-[#3B6D11]',
    'At Risk': 'bg-[#FAEEDA] text-[#854F0B]',
    'Off Track': 'bg-[#FCEBEB] text-[#A32D2D]',
  };
  if (!status || !map[status]) return null;
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}

// ─── Auto-Data Card ─────────────────────────────────────────────────────────────

function DataCard({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-100`}>
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon size={14} />
        </div>
        <span className="text-xs font-semibold text-gray-700">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2 text-sm">
        {children}
      </div>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

// ─── Collapsible Section ────────────────────────────────────────────────────────

function FormSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Styled Report Renderer ─────────────────────────────────────────────────────

function parseReportSections(text) {
  const parts = text.split(/^## /m).filter(Boolean);
  return parts.map(p => {
    const nl = p.indexOf('\n');
    return {
      title: nl > -1 ? p.slice(0, nl).trim() : p.trim(),
      body: nl > -1 ? p.slice(nl + 1).trim() : '',
    };
  });
}

function renderBody(body) {
  // Render markdown-ish body: bold, bullets, line breaks
  return body.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;

    // Bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-[#009ADE] mt-[7px] text-[8px]">●</span>
          <span dangerouslySetInnerHTML={{ __html: boldify(trimmed.slice(2)) }} />
        </div>
      );
    }

    return <p key={i} dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />;
  });
}

function boldify(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function StyledReport({ reportOutput, vp, startDate, endDate, vpInputs }) {
  const sections = parseReportSections(reportOutput);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Determine quarter label
  const start = new Date(startDate);
  const quarter = `Q${Math.ceil((start.getMonth() + 1) / 3)} ${start.getFullYear()}`;

  return (
    <div className="vp-report-output">
      {/* Cover Block */}
      <div style={{ background: '#1a2b3c', padding: '40px 48px 32px', borderRadius: '12px 12px 0 0' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 28, letterSpacing: '-1px', fontFamily: 'system-ui, sans-serif' }}>
          a&a
        </div>
        <div style={{ width: 48, height: 3, background: '#E12F2C', margin: '20px 0 24px' }} />
        <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 300, lineHeight: 1.2, margin: 0 }}>
          {vp}<br />
          <span style={{ fontSize: 24 }}>Quarterly Performance Report</span>
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8 }}>
          Operations Performance · {quarter}
        </div>
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.3)', marginTop: 24, paddingTop: 16, display: 'flex', gap: 48 }}>
          {[
            { label: 'VP', value: vp },
            { label: 'Period', value: `${startDate} – ${endDate}` },
            { label: 'Generated', value: today },
            { label: 'Status', value: vpInputs.status || '—' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#009ADE', letterSpacing: '1.5px', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 13, color: '#fff' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ background: '#fff', padding: '40px 48px' }}>
        {sections.map((section, i) => (
          <div key={i} style={{ marginBottom: 32, pageBreakInside: 'avoid' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#009ADE', letterSpacing: '2px', fontWeight: 600, marginBottom: 8 }}>
              {section.title}
            </div>
            <div style={{ width: '100%', height: '0.5px', background: '#E12F2C', marginBottom: 16 }} />
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#272727' }}>
              {renderBody(section.body)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid #e0e0e0',
        padding: '20px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '0 0 12px 12px',
        background: '#fff',
      }}>
        <span style={{ fontSize: 11, color: '#5A5D62' }}>A&A Elevated Facility Solutions · Confidential</span>
        <span style={{ fontSize: 11, color: '#009ADE' }}>aaefs.com</span>
      </div>
    </div>
  );
}

// ─── Print Styles ───────────────────────────────────────────────────────────────

const printStyles = `
@media print {
  body > *:not(.vp-report-print-container) { display: none !important; }
  .vp-report-print-container { display: block !important; }
  .vp-report-output { border-radius: 0 !important; }
  @page { margin: 0.5in; }
}
`;

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function VPReportTab({
  vp, startDate, endDate,
  workforceKpis, qualityKpis, financialKpis, safetyKpis,
  deficiencyByArea, vpSummary, tenantId,
}) {
  const [vpInputs, setVpInputs] = useState(defaultInputs());
  const [reportOutput, setReportOutput] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const saveTimer = useRef(null);
  const reportRef = useRef(null);

  // ── VP row from summary ─────────────────────────────────────────────────────
  const vpRow = useMemo(
    () => vpSummary?.find(r => r.vp === vp) || null,
    [vpSummary, vp],
  );

  // Top 3 deficiency areas
  const topAreas = useMemo(() => {
    const areas = deficiencyByArea?.areas || [];
    return areas.slice(0, 3);
  }, [deficiencyByArea]);

  // ── Restore saved draft on VP change ────────────────────────────────────────
  useEffect(() => {
    if (!vp || vp === 'all') return;
    try {
      const saved = localStorage.getItem(storageKey(vp, tenantId));
      if (saved) {
        const parsed = JSON.parse(saved);
        setVpInputs(parsed.inputs || defaultInputs());
        setReportOutput(parsed.report || null);
        setLastSaved(parsed.savedAt ? new Date(parsed.savedAt) : null);
      } else {
        setVpInputs(defaultInputs());
        setReportOutput(null);
        setLastSaved(null);
      }
    } catch {
      setVpInputs(defaultInputs());
      setReportOutput(null);
    }
  }, [vp, tenantId]);

  // ── Auto-save debounced ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!vp || vp === 'all') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const now = new Date();
        localStorage.setItem(storageKey(vp, tenantId), JSON.stringify({
          inputs: vpInputs,
          report: reportOutput,
          savedAt: now.toISOString(),
        }));
        setLastSaved(now);
      } catch { /* quota exceeded — ignore */ }
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [vpInputs, reportOutput, vp, tenantId]);

  // ── Input helpers ───────────────────────────────────────────────────────────
  const update = useCallback((field, value) => {
    setVpInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateKeyChange = useCallback((idx, value) => {
    setVpInputs(prev => {
      const kc = [...prev.keyChanges];
      kc[idx] = value;
      return { ...prev, keyChanges: kc };
    });
  }, []);

  const updateInitiative = useCallback((idx, field, value) => {
    setVpInputs(prev => {
      const inits = [...prev.initiatives];
      inits[idx] = { ...inits[idx], [field]: value };
      return { ...prev, initiatives: inits };
    });
  }, []);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const autoData = {
        workforce: workforceKpis,
        quality: qualityKpis,
        financial: financialKpis,
        safety: safetyKpis,
        vpRow,
        topDeficiencyAreas: topAreas,
      };
      const result = await callAgent('vpReport', 'generateReport', {
        autoData, vpInputs, vp, startDate, endDate,
      });
      setReportOutput(result);
      setFormCollapsed(true);
    } catch (err) {
      console.error('VP report generation error:', err);
      setError(err.message || 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [workforceKpis, qualityKpis, financialKpis, safetyKpis, vpRow, topAreas, vpInputs, vp, startDate, endDate]);

  // ── Copy text ───────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (reportOutput) {
      navigator.clipboard.writeText(reportOutput);
    }
  }, [reportOutput]);

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (!reportRef.current) return;
    const html = reportRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html><head>
<title>VP Report — ${vp}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; }
  @media print { @page { margin: 0.5in; } }
</style>
</head><body>
<div class="vp-report-print-container">${html}</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`);
    win.document.close();
  }, [vp]);

  // ── Guard: VP not selected ──────────────────────────────────────────────────
  if (!vp || vp === 'all') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <FileText size={40} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-base font-semibold text-gray-700">Select a VP</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
          Select a VP from the filter above to generate their quarterly performance report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{printStyles}</style>

      {/* ── Report Header ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">VP Quarterly Performance Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              {vp} · {startDate} – {endDate}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Generated {new Date().toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileText size={14} />
                Generate Report
              </>
            )}
          </button>
        </div>
        {lastSaved && (
          <p className="text-xs text-gray-400 mt-3">
            Draft saved {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* ── Section B: Auto-Populated Data Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Workforce */}
        <DataCard title="Workforce & Labor" icon={Users} color="text-blue-700 bg-blue-50">
          {workforceKpis ? (
            <>
              <DataRow label="Active Headcount" value={fmt(workforceKpis.activeHeadcount, 'integer')} />
              <DataRow
                label="Turnover Rate"
                value={workforceKpis.hasTurnoverData
                  ? `${fmt(workforceKpis.turnoverRate, 'pct')} (${workforceKpis.terminations} terminations)`
                  : '—'}
              />
              <DataRow
                label="Overtime %"
                value={workforceKpis.hasOvertimeData
                  ? fmt(workforceKpis.overtimePct, 'pct')
                  : '—'}
              />
              <DataRow label="Paid Time Off" value={workforceKpis.hasAbsenceData ? `${fmt(workforceKpis.ptoCount, 'integer')} · ${fmt(workforceKpis.ptoHours, 'integer')} hrs` : '—'} />
              <DataRow label="Sick Days" value={workforceKpis.hasAbsenceData ? `${fmt(workforceKpis.sickCount, 'integer')} · ${fmt(workforceKpis.sickHours, 'integer')} hrs` : '—'} />
              <DataRow label="Other Absences" value={workforceKpis.hasAbsenceData ? `${fmt(workforceKpis.otherAbsenceCount, 'integer')} · ${fmt(workforceKpis.otherAbsenceHours, 'integer')} hrs` : '—'} />
            </>
          ) : <p className="text-gray-400 text-xs">Loading…</p>}
        </DataCard>

        {/* Quality */}
        <DataCard title="Quality" icon={ClipboardList} color="text-green-700 bg-green-50">
          {qualityKpis ? (
            <>
              {vpRow && (
                <>
                  <DataRow label="Safety Inspections" value={vpRow.safetyInspCount || 0} />
                  <DataRow label="Safety Pass Rate" value={fmt(vpRow.safetyPassRate, 'pct')} />
                  <DataRow label="Quality Inspections" value={vpRow.standardInspCount || 0} />
                  <DataRow label="Avg Quality Score" value={fmt(vpRow.standardAvgScore, 'pct')} />
                </>
              )}
              <DataRow label="Open Deficiencies" value={qualityKpis.openDeficiencies} />
              <DataRow label="Avg Close Days" value={vpRow?.avgCloseDays ?? '—'} />
              {topAreas.length > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Top Deficiency Areas</div>
                  {topAreas.map((a, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-500">{a.area}</span>
                      <span className="font-medium text-gray-700">{a.deficiency_rate ?? a.deficiencyRate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p className="text-gray-400 text-xs">Loading…</p>}
        </DataCard>

        {/* Financial */}
        <DataCard title="Financial" icon={DollarSign} color="text-purple-700 bg-purple-50">
          {financialKpis ? (
            financialKpis.hasPayrollData ? (
              <>
                <DataRow label="Total Payroll" value={fmt(financialKpis.totalPayroll, 'currency')} />
                <DataRow label="Overtime Pay" value={fmt(financialKpis.otPay, 'currency')} />
                {financialKpis.hasBudgetData && (
                  <>
                    <DataRow label="Budget Labor" value={fmt(financialKpis.budgetLaborDollars, 'currency')} />
                    <DataRow label="Variance" value={fmt(financialKpis.laborVariancePct, 'pct')} />
                    {financialKpis.oldestBudgetUpdate && financialKpis.budgetLastUpdated && (
                      <DataRow label="Budget Range" value={`${financialKpis.oldestBudgetUpdate} → ${financialKpis.budgetLastUpdated}`} />
                    )}
                  </>
                )}
              </>
            ) : <p className="text-gray-400 text-xs">No payroll data in selected period</p>
          ) : <p className="text-gray-400 text-xs">Loading…</p>}
        </DataCard>

        {/* Safety */}
        <DataCard title="Safety & Compliance" icon={ShieldCheck} color="text-red-700 bg-red-50">
          {safetyKpis ? (
            safetyKpis.hasData ? (
              <>
                <DataRow label="Open Claims" value={safetyKpis.openClaims} />
                <DataRow label="Out of Work" value={safetyKpis.outOfWork} />
                <DataRow label="Total Incurred" value={fmt(safetyKpis.totalIncurred, 'currency')} />
                <DataRow label="Recordable Incidents" value={safetyKpis.recordableIncidents} />
                <DataRow label="Lost Time Incidents" value={safetyKpis.lostTimeIncidents} />
              </>
            ) : <p className="text-gray-400 text-xs">No claims data in selected period</p>
          ) : <p className="text-gray-400 text-xs">Loading…</p>}
        </DataCard>
      </div>

      {/* ── Section C: VP Narrative Input Form ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => setFormCollapsed(f => !f)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded-t-xl"
        >
          <span>VP Narrative Inputs</span>
          {formCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {!formCollapsed && (
          <div className="px-6 pb-6 space-y-4">

            {/* 1. Executive Summary */}
            <FormSection title="Executive Summary">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Overall Status</label>
                <div className="flex gap-3">
                  {['On Track', 'At Risk', 'Off Track'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vp-status"
                        value={s}
                        checked={vpInputs.status === s}
                        onChange={() => update('status', s)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <StatusBadge status={s} />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Key Changes This Quarter</label>
                {vpInputs.keyChanges.map((c, i) => (
                  <input
                    key={i}
                    type="text"
                    value={c}
                    onChange={e => updateKeyChange(i, e.target.value)}
                    placeholder={`Change ${i + 1}`}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">VP Takeaway</label>
                <textarea
                  value={vpInputs.vpTakeaway}
                  onChange={e => update('vpTakeaway', e.target.value)}
                  placeholder="Your overall assessment of the quarter…"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </FormSection>

            {/* 2. Strategic Initiatives */}
            <FormSection title="Strategic Initiatives">
              {vpInputs.initiatives.map((init, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-gray-500">Initiative {i + 1}</div>
                  <input
                    type="text"
                    value={init.name}
                    onChange={e => updateInitiative(i, 'name', e.target.value)}
                    placeholder="Initiative name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-3">
                    {['On Track', 'At Risk', 'Off Track'].map(s => (
                      <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name={`init-status-${i}`}
                          value={s}
                          checked={init.status === s}
                          onChange={() => updateInitiative(i, 'status', s)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={init.impact}
                    onChange={e => updateInitiative(i, 'impact', e.target.value)}
                    placeholder="Expected impact"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </FormSection>

            {/* 3. Client Health */}
            <FormSection title="Client Health">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Escalations</label>
                <textarea
                  value={vpInputs.escalations}
                  onChange={e => update('escalations', e.target.value)}
                  placeholder="Any client escalations this quarter…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contracts at Risk</label>
                <textarea
                  value={vpInputs.contractsAtRisk}
                  onChange={e => update('contractsAtRisk', e.target.value)}
                  placeholder="Contracts that may not renew or need attention…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contracts for Renewal</label>
                <textarea
                  value={vpInputs.contractsForRenewal}
                  onChange={e => update('contractsForRenewal', e.target.value)}
                  placeholder="Upcoming renewals…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </FormSection>

            {/* 4. Safety Notes */}
            <FormSection title="Safety Notes">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">High-Risk Site Context</label>
                <textarea
                  value={vpInputs.highRiskContext}
                  onChange={e => update('highRiskContext', e.target.value)}
                  placeholder="Context on any high-risk sites…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Training Activities</label>
                <textarea
                  value={vpInputs.trainingActivities}
                  onChange={e => update('trainingActivities', e.target.value)}
                  placeholder="Safety training conducted this quarter…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </FormSection>

            {/* 5. Next Quarter Priorities */}
            <FormSection title="Next Quarter Priorities">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority 1</label>
                <input
                  type="text"
                  value={vpInputs.priority1}
                  onChange={e => update('priority1', e.target.value)}
                  placeholder="Top priority for next quarter"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority 2</label>
                <input
                  type="text"
                  value={vpInputs.priority2}
                  onChange={e => update('priority2', e.target.value)}
                  placeholder="Second priority"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority 3</label>
                <input
                  type="text"
                  value={vpInputs.priority3}
                  onChange={e => update('priority3', e.target.value)}
                  placeholder="Third priority"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Decisions Needed</label>
                <textarea
                  value={vpInputs.decisionsNeeded}
                  onChange={e => update('decisionsNeeded', e.target.value)}
                  placeholder="Decisions that need executive input…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Key Risks</label>
                <textarea
                  value={vpInputs.keyRisks}
                  onChange={e => update('keyRisks', e.target.value)}
                  placeholder="Risks to watch next quarter…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </FormSection>

            {/* 6. Additional Notes */}
            <FormSection title="Additional Notes" defaultOpen={false}>
              <textarea
                value={vpInputs.additionalNotes}
                onChange={e => update('additionalNotes', e.target.value)}
                placeholder="Anything else to include in the report…"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </FormSection>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Generating spinner ── */}
      {generating && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <RefreshCw size={24} className="mx-auto text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-600">Generating report…</p>
          <p className="text-xs text-gray-400 mt-1">This may take 15–30 seconds</p>
        </div>
      )}

      {/* ── Report Output ── */}
      {reportOutput && !generating && (
        <>
          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Copy size={14} />
              Copy Text
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer size={14} />
              Print / PDF
            </button>
          </div>

          {/* Styled Report */}
          <div ref={reportRef} className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <StyledReport
              reportOutput={reportOutput}
              vp={vp}
              startDate={startDate}
              endDate={endDate}
              vpInputs={vpInputs}
            />
          </div>
        </>
      )}
    </div>
  );
}
