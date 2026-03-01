import { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

const STEPS = [
  { label: 'Creating workspaces...', delay: 2000 },
  { label: 'Configuring agents...', delay: 1500 },
  { label: 'Setting up tools...', delay: 1500 },
  { label: 'Initializing dashboards...', delay: 1500 },
];

export default function PortalGeneratingScreen({ onComplete }) {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    let totalDelay = 0;
    const timers = STEPS.map((step, i) => {
      totalDelay += step.delay;
      return setTimeout(() => setCompletedCount(i + 1), totalDelay);
    });

    // After all steps complete, wait a beat then call onComplete
    const finalTimer = setTimeout(() => onComplete(), totalDelay + 800);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, [onComplete]);

  return (
    <div className="max-w-md mx-auto pt-20 text-center">
      <h2 className="text-2xl font-light text-dark-text mb-2">Building your portal...</h2>
      <p className="text-sm text-secondary-text mb-12">
        This will just take a moment.
      </p>

      <div className="space-y-4 text-left max-w-xs mx-auto">
        {STEPS.map((step, i) => {
          const isDone = i < completedCount;
          const isActive = i === completedCount;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                isDone || isActive ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {isDone ? (
                <CheckCircle size={18} className="text-green-500 shrink-0" />
              ) : isActive ? (
                <Loader2 size={18} className="text-[#C84B0A] animate-spin shrink-0" />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 shrink-0" />
              )}
              <span className={`text-sm ${isDone ? 'text-dark-text' : isActive ? 'text-dark-text font-medium' : 'text-secondary-text'}`}>
                {isDone ? step.label.replace('...', '') : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
