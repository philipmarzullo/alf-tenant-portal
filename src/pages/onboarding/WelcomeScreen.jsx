import { ArrowRight } from 'lucide-react';

export default function WelcomeScreen({ onNext }) {
  return (
    <div className="max-w-lg mx-auto pt-16 text-center">
      <h1 className="text-3xl font-light text-dark-text mb-3">
        Welcome to Alf
      </h1>
      <p className="text-base text-secondary-text mb-2">
        Let's set up your operations portal.
      </p>
      <p className="text-sm text-secondary-text mb-10 max-w-md mx-auto">
        We'll walk you through a few steps to understand your company, departments, and services.
        This helps us configure your portal with the right workspaces, tools, and dashboards.
      </p>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#C84B0A] text-white text-sm font-medium rounded-lg hover:bg-[#C84B0A]/90 transition-colors"
      >
        Get Started
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
