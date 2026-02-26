import { useState } from 'react';
import { contracts } from '../../data/mock/salesMocks';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import SlidePanel from '../../components/layout/SlidePanel';

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

const SERVICE_LABELS = {
  janitorial: 'Janitorial',
  integrated: 'Integrated',
  grounds: 'Grounds',
  mep: 'MEP',
};

function variance(current, prior) {
  if (!prior) return null;
  return ((current - prior) / prior * 100).toFixed(1);
}

export default function APCTracker() {
  const [selected, setSelected] = useState(null);

  const active = contracts.filter((c) => c.status !== 'expired');
  const totalAnnual = active.reduce((sum, c) => sum + c.apcAnnual, 0);
  const withPrior = active.filter((c) => c.apcPriorYear > 0);
  const avgVariance = withPrior.length
    ? (withPrior.reduce((sum, c) => sum + ((c.apcAnnual - c.apcPriorYear) / c.apcPriorYear) * 100, 0) / withPrior.length).toFixed(1)
    : '0.0';

  const columns = [
    { key: 'client', label: 'Client', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
    { key: 'serviceType', label: 'Service', render: (v) => <span className="text-xs">{SERVICE_LABELS[v]}</span> },
    { key: 'apcMonthly', label: 'Monthly APC', render: (v) => fmt(v) },
    { key: 'apcAnnual', label: 'Annual APC', render: (v) => <span className="font-medium text-aa-blue">{fmt(v)}</span> },
    { key: 'apcPriorYear', label: 'Prior Year', render: (v) => v ? fmt(v) : '—' },
    {
      key: 'variance',
      label: 'Variance',
      render: (_, row) => {
        const v = variance(row.apcAnnual, row.apcPriorYear);
        if (v === null) return <span className="text-xs text-secondary-text">New</span>;
        const positive = parseFloat(v) >= 0;
        return (
          <span className={`text-xs font-medium ${positive ? 'text-status-green' : 'text-status-red'}`}>
            {positive ? '+' : ''}{v}%
          </span>
        );
      },
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'accountManager', label: 'Acct Mgr', render: (v) => <span className="text-xs">{v}</span> },
  ];

  return (
    <div>
      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-secondary-text">Total Annual APC</div>
          <div className="text-xl font-semibold text-dark-text">{fmt(totalAnnual)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-secondary-text">Avg Year-over-Year Variance</div>
          <div className="text-xl font-semibold text-status-green">+{avgVariance}%</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-secondary-text">Active Contracts</div>
          <div className="text-xl font-semibold text-dark-text">{active.length}</div>
        </div>
      </div>

      <DataTable columns={columns} data={active} onRowClick={(row) => setSelected(row)} />

      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.client} — APC Detail` : ''}
      >
        {selected && (
          <div className="space-y-6">
            <div>
              <div className="text-xs text-secondary-text mb-1">Site</div>
              <div className="text-sm font-medium text-dark-text">{selected.site}</div>
            </div>
            <div>
              <div className="text-xs text-secondary-text mb-1">Service Type</div>
              <div className="text-sm font-medium text-dark-text">{SERVICE_LABELS[selected.serviceType]}</div>
            </div>
            <div>
              <div className="text-xs text-secondary-text mb-1">Account Manager</div>
              <div className="text-sm font-medium text-dark-text">{selected.accountManager}</div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">APC Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Monthly APC</span>
                  <span className="text-sm font-medium text-dark-text">{fmt(selected.apcMonthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Annual APC</span>
                  <span className="text-sm font-semibold text-aa-blue">{fmt(selected.apcAnnual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Prior Year</span>
                  <span className="text-sm font-medium text-dark-text">{selected.apcPriorYear ? fmt(selected.apcPriorYear) : 'N/A (new)'}</span>
                </div>
                {selected.apcPriorYear > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-text">Variance</span>
                    <span className={`text-sm font-medium ${parseFloat(variance(selected.apcAnnual, selected.apcPriorYear)) >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                      {parseFloat(variance(selected.apcAnnual, selected.apcPriorYear)) >= 0 ? '+' : ''}{variance(selected.apcAnnual, selected.apcPriorYear)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">Contract Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Contract Period</span>
                  <span className="text-sm font-medium text-dark-text">
                    {new Date(selected.contractStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — {new Date(selected.contractEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">TBI YTD</span>
                  <span className="text-sm font-medium text-dark-text">{fmt(selected.tbiYtd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">TBI Pending</span>
                  <span className="text-sm font-medium text-dark-text">{selected.tbiPending > 0 ? fmt(selected.tbiPending) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
