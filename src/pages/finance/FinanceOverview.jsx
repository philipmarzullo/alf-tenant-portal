import { useState } from 'react';
import { DollarSign, AlertTriangle, FileText, TrendingDown } from 'lucide-react';
import AlfIcon from '../../components/shared/AlfIcon';
import MetricCard from '../../components/shared/MetricCard';
import ComingSoonModule from '../../components/shared/ComingSoonModule';
import DataTable from '../../components/shared/DataTable';
import SlidePanel from '../../components/layout/SlidePanel';
import AgentActionButton from '../../components/shared/AgentActionButton';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';
import { arAging } from '../../data/mock/financeMocks';

const METRICS = [
  { label: 'Outstanding AR', value: '$842,300', icon: DollarSign },
  { label: 'Overdue 60+', value: '$127,450', icon: AlertTriangle, color: '#DC2626' },
  { label: 'AP Pending', value: '12', icon: FileText },
  { label: 'Budget Variance', value: '-2.3%', icon: TrendingDown, color: '#EAB308' },
];

const MODULES = [
  { title: 'Accounts Receivable Management', description: 'Aging tracking, collection workflows, client billing' },
  { title: 'Accounts Payable Processing', description: 'Invoice approval, vendor payments, GL coding' },
  { title: 'Budget Tracking & Variance Analysis', description: 'Account-level monitoring, anomaly detection' },
  { title: 'Financial Reporting', description: 'Period close support, exec summaries' },
];

const arColumns = [
  { key: 'client', label: 'Client', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
  { key: 'total', label: 'Total Outstanding', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'bucket30', label: '1-30 Days' },
  { key: 'bucket60', label: '31-60 Days' },
  { key: 'bucket90', label: '61-90 Days' },
  { key: 'bucket91', label: '91+ Days', render: (v) => (
    <span className={v !== '$0' ? 'text-status-red font-medium' : ''}>{v}</span>
  )},
  { key: 'lastPayment', label: 'Last Payment' },
];

export default function FinanceOverview() {
  const [selected, setSelected] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const toast = useToast();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-light text-dark-text">Finance Workspace</h1>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <AlfIcon size={16} />
          Ask Alf
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* AR Quick View */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          AR Quick View
        </h2>
        <DataTable columns={arColumns} data={arAging} onRowClick={setSelected} />
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

      {/* Slide Panel for AR detail */}
      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.client || ''}>
        {selected && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-secondary-text mb-1">Total Outstanding</div>
                <div className="text-2xl font-semibold text-dark-text">{selected.total}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-text mb-1">Last Payment</div>
                <div className="text-sm text-dark-text">{selected.lastPayment}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">Aging Breakdown</div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-secondary-text">1-30 days:</span> <span className="text-sm font-medium">{selected.bucket30}</span></div>
                <div><span className="text-xs text-secondary-text">31-60 days:</span> <span className="text-sm font-medium">{selected.bucket60}</span></div>
                <div><span className="text-xs text-secondary-text">61-90 days:</span> <span className="text-sm font-medium">{selected.bucket90}</span></div>
                <div><span className="text-xs text-secondary-text">91+ days:</span> <span className={`text-sm font-medium ${selected.bucket91 !== '$0' ? 'text-status-red' : ''}`}>{selected.bucket91}</span></div>
              </div>
            </div>

            <div className="flex gap-2">
              <AgentActionButton label="Draft Collection Email" variant="primary" onClick={async () => {
                const result = await callAgent('finance', 'draftCollectionEmail', selected);
                setAgentResult(result);
                toast('Collection email drafted');
              }} />
              <AgentActionButton label="Summarize Account" onClick={async () => {
                const result = await callAgent('finance', 'summarizeAccount', selected);
                setAgentResult(result);
                toast('Account summary generated');
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
        agentKey="finance"
        agentName="Finance Agent"
        context="AR aging, accounts payable, budgets, and financial reporting"
      />
    </div>
  );
}
