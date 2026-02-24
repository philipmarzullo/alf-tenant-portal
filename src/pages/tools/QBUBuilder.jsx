import { useState } from 'react';
import { FileBarChart } from 'lucide-react';
import AgentActionButton from '../../components/shared/AgentActionButton';
import StatusBadge from '../../components/shared/StatusBadge';

const RECENT = [
  { id: 1, client: 'Greenfield University', quarter: 'Q4 2025', created: 'Dec 15, 2025', status: 'complete' },
  { id: 2, client: 'Fordham University', quarter: 'Q4 2025', created: 'Dec 18, 2025', status: 'complete' },
  { id: 3, client: 'Mount Sinai Health System', quarter: 'Q4 2025', created: 'Jan 5, 2026', status: 'complete' },
];

export default function QBUBuilder() {
  const [form, setForm] = useState({ client: '', quarter: 'Q1 2026', date: '' });

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">QBU Builder</h1>
      <p className="text-sm text-secondary-text mb-6">
        Generate branded Quarterly Business Update decks for client accounts.
      </p>

      {/* Intake form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 max-w-xl">
        <h2 className="text-sm font-semibold text-dark-text mb-4 flex items-center gap-2">
          <FileBarChart size={16} className="text-aa-blue" />
          Start New QBU
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Client Name</label>
            <input
              type="text"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="e.g., Greenfield University"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Quarter</label>
              <select
                value={form.quarter}
                onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
              >
                <option>Q1 2026</option>
                <option>Q4 2025</option>
                <option>Q3 2025</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
              />
            </div>
          </div>
          <AgentActionButton label="Generate QBU" variant="primary" onClick={() => {}} />
        </div>
      </div>

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
