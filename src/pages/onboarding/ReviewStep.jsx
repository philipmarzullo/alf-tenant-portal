import { ArrowLeft, Pencil, Loader2 } from 'lucide-react';
import { OWNERSHIP_MODELS } from '../../data/onboardingDefaults';

function Section({ title, stepNum, onEdit, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-dark-text">{title}</h3>
        <button
          onClick={() => onEdit(stepNum)}
          className="inline-flex items-center gap-1 text-xs text-[#C84B0A] hover:text-[#C84B0A]/80 transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="mb-2">
      <span className="text-xs text-secondary-text">{label}</span>
      <div className="text-sm text-dark-text">{value}</div>
    </div>
  );
}

export default function ReviewStep({ data, onEdit, onConfirm, onBack, confirming }) {
  const ownershipLabel = OWNERSHIP_MODELS.find(o => o.value === data.ownershipModel)?.label || data.ownershipModel;

  return (
    <div>
      <h2 className="text-xl font-light text-dark-text mb-1">Review & Confirm</h2>
      <p className="text-sm text-secondary-text mb-8">
        Review your company profile. You can go back to edit any section.
      </p>

      {/* Company Basics */}
      <Section title="Company Basics" stepNum={1} onEdit={onEdit}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Industry" value={data.industry} />
          <Field label="Employee Count" value={data.employeeCount} />
          <Field label="Headquarters" value={data.headquarters} />
          <Field label="Founded" value={data.foundedYear} />
          <Field label="Ownership" value={ownershipLabel} />
        </div>
        {data.companyDescription && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-secondary-text">Description</span>
            <p className="text-sm text-dark-text mt-0.5">{data.companyDescription}</p>
          </div>
        )}
      </Section>

      {/* Departments */}
      <Section title="Departments" stepNum={2} onEdit={onEdit}>
        {data.departments.length === 0 ? (
          <p className="text-sm text-secondary-text">No departments selected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.departments.map(dept => (
              <span
                key={dept.key}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-dark-text"
              >
                {dept.name}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Services */}
      <Section title="Services" stepNum={3} onEdit={onEdit}>
        {data.serviceCategories.length === 0 ? (
          <p className="text-sm text-secondary-text">No services configured</p>
        ) : (
          <div className="space-y-3">
            {data.serviceCategories.map((cat, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1">
                  {cat.category}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.services.map(service => (
                    <span
                      key={service}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-dark-text"
                    >
                      {service}
                    </span>
                  ))}
                  {cat.services.length === 0 && (
                    <span className="text-xs text-secondary-text">No services in this category</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Differentiators */}
      <Section title="Differentiators" stepNum={4} onEdit={onEdit}>
        {data.differentiators.length === 0 ? (
          <p className="text-sm text-secondary-text">No differentiators selected</p>
        ) : (
          <div className="space-y-2">
            {data.differentiators.map(diff => (
              <div key={diff.key} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C84B0A] mt-1.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-dark-text">{diff.label}</span>
                  {diff.description && (
                    <p className="text-xs text-secondary-text mt-0.5">{diff.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          disabled={confirming}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-secondary-text hover:text-dark-text transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={confirming}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C84B0A] text-white text-sm font-medium rounded-lg hover:bg-[#C84B0A]/90 transition-colors disabled:opacity-50"
        >
          {confirming ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Confirming...
            </>
          ) : (
            'Confirm & Build Portal'
          )}
        </button>
      </div>
    </div>
  );
}
