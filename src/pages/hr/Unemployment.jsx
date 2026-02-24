import { unemploymentClaims } from '../../data/mock/unemploymentClaims';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { ExternalLink } from 'lucide-react';

const columns = [
  { key: 'employee', label: 'Employee', render: (v) => <span className="font-medium text-dark-text">{v}</span> },
  { key: 'filingDate', label: 'Filing Date' },
  { key: 'state', label: 'State' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'determination', label: 'Determination', render: (v) => v || <span className="text-secondary-text">—</span> },
  {
    key: 'retentionDate',
    label: 'Records Retention',
    render: (v) => v ? (
      <span className="text-sm">{v}</span>
    ) : <span className="text-secondary-text">—</span>,
  },
  {
    key: 'stateUrl',
    label: '',
    render: (v, row) => (
      <button
        onClick={(e) => { e.stopPropagation(); }}
        className="inline-flex items-center gap-1 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
      >
        <ExternalLink size={12} />
        {row.stateCode} Resources
      </button>
    ),
  },
];

export default function Unemployment() {
  return (
    <div>
      <p className="text-sm text-secondary-text mb-4">
        Track unemployment claim filings, determinations, and 7-year records retention compliance.
      </p>
      <DataTable columns={columns} data={unemploymentClaims} />
    </div>
  );
}
