import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { benefitsEnrollments, KANBAN_COLUMNS } from '../../data/mock/benefitsEnrollments';
import SlidePanel from '../../components/layout/SlidePanel';
import AgentActionButton from '../../components/shared/AgentActionButton';

const STATUS_ICON = {
  submitted: <CheckCircle size={14} className="text-status-green" />,
  pending: <Clock size={14} className="text-status-yellow" />,
  overdue: <XCircle size={14} className="text-status-red" />,
};

export default function Benefits() {
  const [selected, setSelected] = useState(null);

  const grouped = KANBAN_COLUMNS.map((col) => ({
    ...col,
    cards: benefitsEnrollments.filter((e) => e.status === col.key),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-secondary-text">
          Track new hire benefits enrollment from waiting period through completion.
        </p>
        <AgentActionButton label="Run Enrollment Audit" variant="default" onClick={() => {}} />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div key={col.key} className="min-h-[400px]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
                {col.label}
              </span>
              <span className="text-xs text-secondary-text">({col.cards.length})</span>
            </div>

            <div className="flex flex-col gap-2">
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className={`bg-white rounded-lg border p-4 cursor-pointer hover:border-gray-300 transition-colors ${
                    card.urgent ? 'border-status-red/40 bg-red-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm text-dark-text">{card.name}</div>
                  <div className="text-xs text-secondary-text mt-1">Hired {card.hireDate}</div>
                  {card.daysRemaining > 0 && (
                    <div className={`text-xs font-medium mt-2 ${card.urgent ? 'text-status-red' : 'text-secondary-text'}`}>
                      {card.urgent && <AlertTriangle size={12} className="inline mr-1" />}
                      {card.daysRemaining} days remaining
                    </div>
                  )}
                  {card.plan && (
                    <div className="text-xs text-secondary-text mt-2">{card.plan}</div>
                  )}
                  <div className="text-[11px] text-secondary-text mt-2">Broker: {card.broker}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Slide Panel */}
      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div>
            <div className="text-sm text-secondary-text mb-1">Hired {selected.hireDate}</div>
            {selected.daysRemaining > 0 && (
              <div className="text-sm font-medium text-dark-text mb-4">{selected.daysRemaining} days remaining in enrollment window</div>
            )}
            {selected.plan && <div className="text-sm mb-4">Plan: <span className="font-medium">{selected.plan}</span></div>}

            <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3 mt-6">
              Enrollment Timeline
            </h3>
            <div className="space-y-3">
              {selected.timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    step.done ? 'bg-status-green/10' : 'bg-gray-100'
                  }`}>
                    {step.done ? (
                      <CheckCircle size={14} className="text-status-green" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-dark-text">{step.step}</div>
                    {step.date && <div className="text-xs text-secondary-text">{step.date}</div>}
                  </div>
                </div>
              ))}
            </div>

            {(selected.status === 'open' || selected.status === 'waiting') && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <AgentActionButton label="Draft Reminder Email" variant="primary" onClick={() => {}} />
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
