import { useState } from 'react';
import { Presentation } from 'lucide-react';
import AgentActionButton from '../../components/shared/AgentActionButton';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';

const RECENT = [
  { id: 1, prospect: 'Columbia University', industry: 'Education', created: 'Feb 10, 2026', status: 'complete' },
  { id: 2, prospect: 'Brookfield Properties', industry: 'Commercial Office', created: 'Jan 22, 2026', status: 'complete' },
];

export default function SalesDeckBuilder() {
  const [form, setForm] = useState({ prospect: '', industry: '', facilityType: '', concerns: '' });
  const [result, setResult] = useState(null);
  const toast = useToast();

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Sales Deck Builder</h1>
      <p className="text-sm text-secondary-text mb-6">
        Generate prospect-specific sales presentation content.
      </p>

      {/* Intake form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 max-w-xl">
        <h2 className="text-sm font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Presentation size={16} className="text-aa-blue" />
          Start New Sales Deck
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Prospect Name</label>
            <input
              type="text"
              value={form.prospect}
              onChange={(e) => setForm({ ...form, prospect: e.target.value })}
              placeholder="e.g., Columbia University"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Industry</label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue bg-white"
              >
                <option value="">Select...</option>
                <option>Education</option>
                <option>Healthcare</option>
                <option>Commercial Office</option>
                <option>Life Sciences</option>
                <option>Industrial</option>
                <option>Government</option>
                <option>Hospitality</option>
                <option>Aviation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Facility Type</label>
              <input
                type="text"
                value={form.facilityType}
                onChange={(e) => setForm({ ...form, facilityType: e.target.value })}
                placeholder="e.g., Multi-building campus"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary-text mb-1">Key Concerns</label>
            <textarea
              value={form.concerns}
              onChange={(e) => setForm({ ...form, concerns: e.target.value })}
              placeholder="What are the prospect's main pain points?"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue resize-none"
            />
          </div>
          <AgentActionButton label="Generate Sales Deck" variant="primary" onClick={async () => {
            if (!form.prospect) { toast('Please enter a prospect name', 'error'); return; }
            const output = await callAgent('salesDeck', 'generateDeck', form);
            setResult(output);
            toast('Sales deck content generated');
          }} />
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 max-w-xl">
          <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">Generated Content</div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-dark-text leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {result}
          </div>
        </div>
      )}

      {/* Recent decks */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">Recent Decks</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Prospect</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Industry</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {RECENT.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-dark-text">{r.prospect}</td>
                <td className="px-4 py-3">{r.industry}</td>
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
