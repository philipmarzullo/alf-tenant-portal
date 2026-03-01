const STEP_LABELS = ['Company', 'Departments', 'Services', 'Differentiators', 'Review'];

/**
 * Progress indicator for the 5-step onboarding form.
 * @param {number} currentStep - 1-5
 */
export default function OnboardingProgressBar({ currentStep }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-1 mb-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          return (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  isComplete || isActive ? 'bg-[#C84B0A]' : 'bg-gray-200'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          return (
            <span
              key={label}
              className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#C84B0A]' : 'text-secondary-text'
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
