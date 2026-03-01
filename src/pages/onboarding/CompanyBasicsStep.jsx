import { ArrowRight, ArrowLeft } from 'lucide-react';
import { INDUSTRIES, EMPLOYEE_COUNT_OPTIONS, OWNERSHIP_MODELS } from '../../data/onboardingDefaults';

const inputClass = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C84B0A]/20 focus:border-[#C84B0A] bg-white text-dark-text';
const labelClass = 'block text-sm font-medium text-dark-text mb-1.5';

export default function CompanyBasicsStep({ data, onChange, onNext, onBack }) {
  return (
    <div>
      <h2 className="text-xl font-light text-dark-text mb-1">Company Basics</h2>
      <p className="text-sm text-secondary-text mb-8">Tell us about your organization.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className={labelClass}>Industry</label>
          <select
            value={data.industry}
            onChange={(e) => onChange('industry', e.target.value)}
            className={inputClass}
          >
            <option value="">Select your industry...</option>
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Company Description</label>
          <textarea
            value={data.companyDescription}
            onChange={(e) => onChange('companyDescription', e.target.value)}
            placeholder="Brief description of what your company does..."
            rows={3}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Employee Count</label>
            <select
              value={data.employeeCount}
              onChange={(e) => onChange('employeeCount', e.target.value)}
              className={inputClass}
            >
              <option value="">Select range...</option>
              {EMPLOYEE_COUNT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Founded Year</label>
            <input
              type="number"
              value={data.foundedYear}
              onChange={(e) => onChange('foundedYear', e.target.value)}
              placeholder="e.g. 1995"
              min={1800}
              max={new Date().getFullYear()}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Headquarters</label>
          <input
            type="text"
            value={data.headquarters}
            onChange={(e) => onChange('headquarters', e.target.value)}
            placeholder="City, State"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Ownership Model</label>
          <select
            value={data.ownershipModel}
            onChange={(e) => onChange('ownershipModel', e.target.value)}
            className={inputClass}
          >
            <option value="">Select...</option>
            {OWNERSHIP_MODELS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-secondary-text hover:text-dark-text transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C84B0A] text-white text-sm font-medium rounded-lg hover:bg-[#C84B0A]/90 transition-colors"
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
