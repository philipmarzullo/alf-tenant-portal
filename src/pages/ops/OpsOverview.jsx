import { useState } from 'react';
import { HardHat, ShieldCheck, AlertTriangle, Clock, Bot } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';
import SlidePanel from '../../components/layout/SlidePanel';
import ComingSoonModule from '../../components/shared/ComingSoonModule';
import AgentActionButton from '../../components/shared/AgentActionButton';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';
import { vpSummary, getOpsSummaryMetrics } from '../../data/mock/operationsMocks';

const summary = getOpsSummaryMetrics();

const METRICS = [
  { label: 'Total Job Count', value: String(summary.totalJobs), icon: HardHat },
  { label: 'Avg Safety Insp. Rate', value: `${summary.avgSafetyRate}%`, icon: ShieldCheck, color: summary.avgSafetyRate < 90 ? '#DC2626' : undefined },
  { label: 'Total Incidents', value: String(summary.totalIncidents), icon: AlertTriangle, color: summary.totalIncidents > 5 ? '#DC2626' : '#EAB308' },
  { label: 'Avg Close Days', value: `${summary.avgCloseDays}d`, icon: Clock, color: summary.avgCloseDays > 2 ? '#DC2626' : undefined },
];

function safetyColor(pct) {
  if (pct < 85) return 'text-status-red font-medium';
  if (pct < 95) return 'text-status-yellow font-medium';
  return 'text-status-green font-medium';
}

const vpColumns = [
  {
    key: 'vp',
    label: 'VP',
    render: (v, row) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
          {row.initials}
        </div>
        <span className="font-medium text-dark-text">{v}</span>
      </div>
    ),
  },
  { key: 'jobCount', label: 'Jobs' },
  {
    key: 'revenueInspectedSafety',
    label: 'Safety %',
    render: (v) => <span className={safetyColor(v)}>{v}%</span>,
  },
  { key: 'safetyInspections', label: 'Safety Insp.' },
  {
    key: 'revenueInspectedCommercial',
    label: 'Commercial %',
    render: (v) => <span className={safetyColor(v)}>{v}%</span>,
  },
  { key: 'commercialInspections', label: 'Comm. Insp.' },
  {
    key: 'sitesWithDeficiencies',
    label: 'Deficiencies',
    render: (v) => <span className={v > 100 ? 'text-status-yellow font-medium' : ''}>{v}</span>,
  },
  {
    key: 'incidents',
    label: 'Incidents',
    render: (v) => <span className={v > 2 ? 'text-status-red font-medium' : ''}>{v}</span>,
  },
  { key: 'goodSaves', label: 'Good Saves' },
  { key: 'compliments', label: 'Compliments' },
  {
    key: 'avgDeficiencyClosedDays',
    label: 'Avg Close',
    render: (v) => <span className={v > 2 ? 'text-status-yellow font-medium' : ''}>{v}d</span>,
  },
];

const MODULES = [
  { title: 'Inspection Detail Tracking', description: 'Individual inspection records, photos, compliance scoring by site' },
  { title: 'Incident & Deficiency Management', description: 'Incident reporting workflows, deficiency resolution tracking, root cause analysis' },
  { title: 'Client Quality Scorecards', description: 'Per-client quality scores, trend analysis, SLA compliance reporting' },
  { title: 'WinTeam Integration Dashboard', description: 'Live WinTeam data feeds, automated KPI refresh, real-time VP dashboards' },
];

export default function OpsOverview() {
  const [selected, setSelected] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const toast = useToast();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-light text-dark-text">Operations Workspace</h1>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <Bot size={16} />
          Ask Operations Agent
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* VP Summary Table */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          VP Performance Summary
        </h2>
        <DataTable columns={vpColumns} data={vpSummary} onRowClick={setSelected} />
      </div>

      {/* Coming soon modules */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
        Planned Modules
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULES.map((m) => (
          <ComingSoonModule key={m.title} {...m} />
        ))}
      </div>

      {/* VP Detail Slide Panel */}
      <SlidePanel open={!!selected} onClose={() => { setSelected(null); setAgentResult(null); }} title={selected?.vp || ''}>
        {selected && (
          <div>
            {/* VP header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {selected.initials}
              </div>
              <div>
                <div className="text-lg font-semibold text-dark-text">{selected.vp}</div>
                <div className="text-sm text-secondary-text">VP Operations · {selected.jobCount} jobs</div>
              </div>
            </div>

            {/* Stat grid */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">Performance Metrics</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-secondary-text">Safety Insp. Rate:</span>{' '}
                  <span className={`text-sm ${safetyColor(selected.revenueInspectedSafety)}`}>{selected.revenueInspectedSafety}%</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Safety Inspections:</span>{' '}
                  <span className="text-sm font-medium">{selected.safetyInspections}</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Commercial Insp. Rate:</span>{' '}
                  <span className={`text-sm ${safetyColor(selected.revenueInspectedCommercial)}`}>{selected.revenueInspectedCommercial}%</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Commercial Inspections:</span>{' '}
                  <span className="text-sm font-medium">{selected.commercialInspections}</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Sites w/ Deficiencies:</span>{' '}
                  <span className="text-sm font-medium">{selected.sitesWithDeficiencies}</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Incidents:</span>{' '}
                  <span className={`text-sm font-medium ${selected.incidents > 2 ? 'text-status-red' : ''}`}>{selected.incidents}</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Good Saves:</span>{' '}
                  <span className="text-sm font-medium text-status-green">{selected.goodSaves}</span>
                </div>
                <div>
                  <span className="text-xs text-secondary-text">Compliments:</span>{' '}
                  <span className="text-sm font-medium text-status-green">{selected.compliments}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-secondary-text">Avg Deficiency Close Days:</span>{' '}
                  <span className={`text-sm font-medium ${selected.avgDeficiencyClosedDays > 2 ? 'text-status-yellow' : ''}`}>
                    {selected.avgDeficiencyClosedDays}d
                  </span>
                  <span className="text-xs text-secondary-text ml-1">(target: &lt;2d)</span>
                </div>
              </div>
            </div>

            {/* Agent actions */}
            <div className="flex gap-2">
              <AgentActionButton label="Generate VP Performance Summary" variant="primary" onClick={async () => {
                const result = await callAgent('ops', 'vpPerformanceSummary', selected);
                setAgentResult(result);
                toast(`Performance summary generated for ${selected.vp}`);
              }} />
            </div>

            {agentResult && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">Agent Output</div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-dark-text font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {agentResult}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="ops"
        agentName="Operations Agent"
        context="VP performance KPIs, inspection rates, deficiency tracking, and incident reporting"
      />
    </div>
  );
}
