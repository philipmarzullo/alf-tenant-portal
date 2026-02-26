import { useState } from 'react';
import { contracts } from '../../data/mock/salesMocks';
import DataTable from '../../components/shared/DataTable';
import SlidePanel from '../../components/layout/SlidePanel';
import StatusBadge from '../../components/shared/StatusBadge';

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

export default function TBITracker() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const active = contracts.filter((c) => c.status !== 'expired');
  const filtered = pendingOnly ? active.filter((c) => c.tbiPending > 0) : active;

  const totalTbiYtd = active.reduce((sum, c) => sum + c.tbiYtd, 0);
  const totalPending = active.reduce((sum, c) => sum + c.tbiPending, 0);
  const totalApc = active.reduce((sum, c) => sum + c.apcAnnual, 0);
  const avgTbiPct = totalApc > 0 ? ((totalTbiYtd + totalPending) / totalApc * 100).toFixed(1) : '0.0';

  const columns = [
    { key: 'client', label: 'Client', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
    { key: 'site', label: 'Site', render: (v) => <span className="text-xs">{v}</span> },
    { key: 'tbiYtd', label: 'YTD Invoiced', render: (v) => fmt(v) },
    {
      key: 'tbiPending',
      label: 'Pending',
      render: (v) => v > 0
        ? <span className="font-medium text-status-yellow">{fmt(v)}</span>
        : <span className="text-secondary-text">—</span>,
    },
    {
      key: 'tbiTotal',
      label: 'Total TBI',
      render: (_, row) => <span className="font-medium">{fmt(row.tbiYtd + row.tbiPending)}</span>,
    },
    {
      key: 'tbiPct',
      label: 'TBI % of APC',
      render: (_, row) => {
        const pct = row.apcAnnual > 0 ? ((row.tbiYtd + row.tbiPending) / row.apcAnnual * 100).toFixed(1) : '0.0';
        return <span className="text-xs">{pct}%</span>;
      },
    },
    { key: 'serviceType', label: 'Service', render: (v) => <span className="text-xs">{SERVICE_LABELS[v]}</span> },
    { key: 'accountManager', label: 'Acct Mgr', render: (v) => <span className="text-xs">{v}</span> },
  ];

  return (
    <div>
      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-secondary-text">Total TBI YTD</div>
          <div className="text-xl font-semibold text-dark-text">{fmt(totalTbiYtd)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-secondary-text">Total Pending</div>
          <div className="text-xl font-semibold text-status-yellow">{fmt(totalPending)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-secondary-text">Avg TBI % of APC</div>
          <div className="text-xl font-semibold text-dark-text">{avgTbiPct}%</div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
            className="rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
          />
          <span className="text-sm text-secondary-text">Show only clients with pending TBI</span>
        </label>
        {pendingOnly && (
          <span className="text-xs text-secondary-text">
            Showing {filtered.length} of {active.length}
          </span>
        )}
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />

      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.client} — TBI Detail` : ''}
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
              <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">TBI Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">YTD Invoiced</span>
                  <span className="text-sm font-medium text-dark-text">{fmt(selected.tbiYtd)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Pending</span>
                  <span className={`text-sm font-medium ${selected.tbiPending > 0 ? 'text-status-yellow' : 'text-dark-text'}`}>
                    {selected.tbiPending > 0 ? fmt(selected.tbiPending) : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-sm font-medium text-dark-text">Total TBI</span>
                  <span className="text-sm font-semibold text-dark-text">{fmt(selected.tbiYtd + selected.tbiPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">TBI as % of Annual APC</span>
                  <span className="text-sm font-medium text-dark-text">
                    {selected.apcAnnual > 0 ? ((selected.tbiYtd + selected.tbiPending) / selected.apcAnnual * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">Contract Context</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-text">Annual APC</span>
                  <span className="text-sm font-medium text-aa-blue">{fmt(selected.apcAnnual)}</span>
                </div>
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
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
