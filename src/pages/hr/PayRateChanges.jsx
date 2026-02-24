import { useState } from 'react';
import { payRateChanges } from '../../data/mock/payRateChanges';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import SlidePanel from '../../components/layout/SlidePanel';
import AgentActionButton from '../../components/shared/AgentActionButton';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';

const columns = [
  { key: 'employee', label: 'Employee', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
  { key: 'currentRate', label: 'Current Rate' },
  { key: 'proposedRate', label: 'Proposed Rate', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
  { key: 'submittedBy', label: 'Submitted By' },
  { key: 'vpStatus', label: 'VP Status', render: (v) => v ? <StatusBadge status={v} /> : <span className="text-secondary-text">—</span> },
  { key: 'hrStatus', label: 'HR Status', render: (v) => v ? <StatusBadge status={v} /> : <span className="text-secondary-text">—</span> },
  { key: 'effectiveDate', label: 'Effective Date' },
  {
    key: 'union',
    label: 'Union',
    render: (v, row) => v ? (
      <span className="text-sm">
        {v} {row.unionCompliant && <span className="text-status-green">✓</span>}
      </span>
    ) : <span className="text-secondary-text text-xs">Non-union</span>
  },
];

export default function PayRateChanges() {
  const [selected, setSelected] = useState(null);
  const [agentResult, setAgentResult] = useState(null);
  const toast = useToast();

  return (
    <div>
      <p className="text-sm text-secondary-text mb-4">
        Track pay rate change requests from supervisor submission through VP approval and HR processing.
      </p>

      <DataTable columns={columns} data={payRateChanges} onRowClick={setSelected} />

      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={`Pay Rate Change — ${selected?.employee || ''}`}>
        {selected && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-secondary-text mb-1">Current Rate</div>
                <div className="text-lg font-medium text-dark-text">{selected.currentRate}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-text mb-1">Proposed Rate</div>
                <div className="text-lg font-medium text-aa-blue">{selected.proposedRate}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-text mb-1">Submitted By</div>
                <div className="text-sm text-dark-text">{selected.submittedBy}</div>
              </div>
              <div>
                <div className="text-xs text-secondary-text mb-1">Effective Date</div>
                <div className="text-sm text-dark-text">{selected.effectiveDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div>
                <span className="text-xs text-secondary-text mr-2">VP:</span>
                {selected.vpStatus && <StatusBadge status={selected.vpStatus} />}
              </div>
              {selected.hrStatus && (
                <div>
                  <span className="text-xs text-secondary-text mr-2">HR:</span>
                  <StatusBadge status={selected.hrStatus} />
                </div>
              )}
            </div>

            {selected.union && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1">Union</div>
                <div className="text-sm text-dark-text">{selected.union}</div>
                {selected.unionCompliant && <div className="text-xs text-status-green mt-1">✓ Compliant with contract</div>}
              </div>
            )}

            {selected.notes && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1">Notes</div>
                <div className="text-sm text-secondary-text">{selected.notes}</div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              {selected.union && (
                <AgentActionButton label="Check Union Compliance" onClick={async () => {
                  const result = await callAgent('hr', 'checkUnionCompliance', {
                    employeeName: selected.employee,
                    union: selected.union,
                    currentRate: selected.currentRate,
                    proposedRate: selected.proposedRate,
                  });
                  setAgentResult(result);
                  toast('Union compliance check complete');
                }} />
              )}
              <AgentActionButton label="Generate WinTeam Update" onClick={async () => {
                const result = await callAgent('hr', 'generateWinTeamUpdate', {
                  employeeName: selected.employee,
                  description: `Pay rate change: ${selected.currentRate} → ${selected.proposedRate}`,
                  effectiveDate: selected.effectiveDate,
                });
                setAgentResult(result);
                toast('WinTeam update generated');
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
    </div>
  );
}
