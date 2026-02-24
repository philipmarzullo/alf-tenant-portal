import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { leaveCases, LEAVE_SUMMARY } from '../../data/mock/leaveCases';
import StatusBadge from '../../components/shared/StatusBadge';
import AgentActionButton from '../../components/shared/AgentActionButton';
import { useToast } from '../../components/shared/ToastProvider';
import { callAgent } from '../../agents/api';

const DOC_ICON = {
  submitted: <CheckCircle size={14} className="text-status-green" />,
  pending: <Clock size={14} className="text-status-yellow" />,
  overdue: <XCircle size={14} className="text-status-red" />,
};

export default function LeaveManagement() {
  const [expanded, setExpanded] = useState(new Set([1]));
  const toast = useToast();

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.values(LEAVE_SUMMARY).map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + '15' }}>
              <span className="text-lg font-semibold" style={{ color: s.color }}>{s.count}</span>
            </div>
            <div>
              <div className="text-sm font-medium text-dark-text">{s.label}</div>
              <div className="text-xs text-secondary-text">active</div>
            </div>
          </div>
        ))}
      </div>

      {/* Leave cases */}
      <div className="space-y-3">
        {leaveCases.map((lc) => {
          const isOpen = expanded.has(lc.id);
          const progress = (lc.currentStep / lc.totalSteps) * 100;

          return (
            <div key={lc.id} className="bg-white rounded-lg border border-gray-200">
              {/* Header */}
              <div
                onClick={() => toggle(lc.id)}
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              >
                {isOpen ? <ChevronDown size={16} className="text-secondary-text" /> : <ChevronRight size={16} className="text-secondary-text" />}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-dark-text text-sm">{lc.employee}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                      backgroundColor: LEAVE_SUMMARY[lc.typeKey]?.color + '15',
                      color: LEAVE_SUMMARY[lc.typeKey]?.color,
                    }}>
                      {lc.type}
                    </span>
                    <StatusBadge status={lc.status} />
                  </div>
                  <div className="text-xs text-secondary-text mt-1">{lc.dates}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-secondary-text">Step {lc.currentStep} of {lc.totalSteps}</div>
                  {/* Progress bar */}
                  <div className="w-32 h-1.5 bg-gray-100 rounded-full mt-1.5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: lc.status === 'complete' ? '#16A34A' : lc.status === 'overdue' ? '#DC2626' : '#009ADE',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-4">
                    <div className="text-sm text-dark-text mb-4">
                      <span className="font-medium">Current step:</span> {lc.stepLabel}
                    </div>

                    {/* Document checklist */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                        Document Checklist
                      </div>
                      <div className="space-y-2">
                        {lc.documents.map((doc, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {DOC_ICON[doc.status]}
                            <span className={doc.status === 'overdue' ? 'text-status-red font-medium' : 'text-dark-text'}>
                              {doc.name}
                            </span>
                            <span className="text-xs text-secondary-text capitalize">— {doc.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {lc.status !== 'complete' && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                        <AgentActionButton label="Send Reminder" onClick={async () => {
                          await callAgent('hr', 'sendReminder', { employeeName: lc.employee, type: lc.type });
                          toast(`Reminder sent for ${lc.employee}`);
                        }} />
                        <AgentActionButton label="Generate WinTeam Update" onClick={async () => {
                          await callAgent('hr', 'generateWinTeamUpdate', { employeeName: lc.employee, description: `${lc.type} — ${lc.stepLabel}` });
                          toast('WinTeam update generated');
                        }} />
                        <AgentActionButton label="Notify Operations" onClick={async () => {
                          await callAgent('hr', 'notifyOperations', { employeeName: lc.employee, type: lc.type, dates: lc.dates });
                          toast('Operations team notified');
                        }} />
                        <AgentActionButton label="Check Eligibility" onClick={async () => {
                          await callAgent('hr', 'checkEligibility', { employeeName: lc.employee, type: lc.type });
                          toast('Eligibility check complete');
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
