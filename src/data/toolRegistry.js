/**
 * Tool Registry
 *
 * Central registry for all document generation tools.
 *
 * IMPORTANT — Backward Compatibility Note:
 * Internal keys like "qbu" and "salesDeck" are kept for backward compatibility
 * with existing database records, route paths, and API calls. Display labels are
 * tenant-agnostic (e.g., "Quarterly Review Builder" instead of "QBU Builder").
 * Do NOT rename these keys — only labels change.
 */

export const TOOL_REGISTRY = {
  qbu: {
    key: 'qbu',
    label: 'Quarterly Review Builder',
    description: 'Generate structured quarterly business review presentations from intake data',
    icon: 'FileBarChart',
    path: '/tools/qbu',
    agentKey: 'qbu',
    actionKey: 'generateQBU',
    outputFormat: 'pptx',
    customComponent: true,
  },
  salesDeck: {
    key: 'salesDeck',
    label: 'Proposal Builder',
    description: 'Create prospect-specific sales proposals tailored to industry and challenges',
    icon: 'Presentation',
    path: '/tools/sales-deck',
    agentKey: 'salesDeck',
    actionKey: 'generateDeck',
    outputFormat: 'pptx',
    customComponent: true,
  },
  transitionPlan: {
    key: 'transitionPlan',
    label: 'Transition Plan Builder',
    description: 'Build phased transition plans with RACI matrices and risk mitigation strategies',
    icon: 'ArrowRightLeft',
    path: '/tools/transition-plan',
    agentKey: 'transitionPlan',
    actionKey: 'generateTransitionPlan',
    outputFormat: 'pdf',
    customComponent: false,
    intakeSchema: [
      { key: 'clientName', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g., Westbridge University' },
      { key: 'siteName', label: 'Site / Location', type: 'text', placeholder: 'e.g., Main Campus' },
      { key: 'transitionType', label: 'Transition Type', type: 'select', options: ['New Account Onboarding', 'Provider Changeover', 'Service Expansion', 'Contract Restructure'], required: true },
      { key: 'startDate', label: 'Target Start Date', type: 'date', required: true },
      { key: 'duration', label: 'Transition Duration', type: 'select', options: ['30 days', '60 days', '90 days', '120 days'] },
      { key: 'servicesInScope', label: 'Services in Scope', type: 'checkboxGroup', options: ['Janitorial', 'Grounds Maintenance', 'MEP', 'Event Support', 'Snow & Ice'] },
      { key: 'currentProvider', label: 'Current Provider (if any)', type: 'text', placeholder: 'Leave blank for new accounts' },
      { key: 'staffingPlan', label: 'Staffing Considerations', type: 'textarea', placeholder: 'Union environment? Existing staff to retain? Key roles needed?' },
      { key: 'risks', label: 'Known Risks or Constraints', type: 'textarea', placeholder: 'Timeline pressures, client sensitivities, regulatory requirements...' },
      { key: 'specialRequirements', label: 'Special Requirements', type: 'textarea', placeholder: 'Security clearances, certifications, equipment needs...' },
    ],
  },
  budget: {
    key: 'budget',
    label: 'Budget Builder',
    description: 'Generate staffing frameworks and coverage models with pricing input checklists',
    icon: 'Calculator',
    path: '/tools/budget',
    agentKey: 'budget',
    actionKey: 'generateBudget',
    outputFormat: 'pdf',
    customComponent: false,
    intakeSchema: [
      { key: 'clientName', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g., Metro General Hospital' },
      { key: 'siteName', label: 'Site / Location', type: 'text', placeholder: 'e.g., Main Hospital Campus' },
      { key: 'budgetType', label: 'Budget Type', type: 'select', options: ['New Proposal', 'Annual Renewal', 'Scope Change', 'Cost Reduction Analysis'], required: true },
      { key: 'serviceLines', label: 'Service Lines', type: 'checkboxGroup', options: ['Janitorial — Day', 'Janitorial — Night', 'Janitorial — Periodic/Deep Clean', 'Grounds Maintenance', 'Snow & Ice', 'MEP — Preventive', 'MEP — Reactive', 'Event Support'] },
      { key: 'sqft', label: 'Approximate Square Footage', type: 'text', placeholder: 'e.g., 850,000 sqft' },
      { key: 'shifts', label: 'Shift Coverage Needed', type: 'textarea', placeholder: 'e.g., 1st shift 6am-2pm, 2nd shift 2pm-10pm, 3rd shift 10pm-6am (partial)' },
      { key: 'unionEnvironment', label: 'Union Environment?', type: 'select', options: ['Yes — specify union', 'No', 'Mixed'] },
      { key: 'currentSpend', label: 'Current Annual Spend (if known)', type: 'text', placeholder: 'e.g., $2.4M' },
      { key: 'targetReduction', label: 'Target Cost Reduction', type: 'text', placeholder: 'e.g., 5-8% or N/A' },
      { key: 'notes', label: 'Additional Context', type: 'textarea', placeholder: 'Equipment needs, special certifications, labor market conditions...' },
    ],
  },
  incidentReport: {
    key: 'incidentReport',
    label: 'Incident Report Generator',
    description: 'Generate standardized incident reports with categorization and follow-up tracking',
    icon: 'ShieldAlert',
    path: '/tools/incident-report',
    agentKey: 'incidentReport',
    actionKey: 'generateIncidentReport',
    outputFormat: 'pdf',
    customComponent: false,
    intakeSchema: [
      { key: 'siteName', label: 'Site / Location', type: 'text', required: true, placeholder: 'e.g., Building A, 3rd Floor' },
      { key: 'incidentDate', label: 'Date of Incident', type: 'date', required: true },
      { key: 'incidentTime', label: 'Time of Incident', type: 'text', placeholder: 'e.g., 2:30 PM' },
      { key: 'category', label: 'Incident Category', type: 'select', options: ['Slip/Trip/Fall', 'Chemical Exposure', 'Equipment Injury', 'Ergonomic', 'Vehicle/Transport', 'Property Damage', 'Near Miss', 'Environmental', 'Other'], required: true },
      { key: 'severity', label: 'Severity', type: 'select', options: ['Minor — First Aid Only', 'Moderate — Medical Treatment', 'Serious — Lost Time', 'Critical — Hospitalization'], required: true },
      { key: 'description', label: 'Incident Description', type: 'textarea', required: true, placeholder: 'What happened? Include who was involved, what they were doing, and the sequence of events.' },
      { key: 'immediateActions', label: 'Immediate Actions Taken', type: 'textarea', placeholder: 'First aid provided, area secured, supervisor notified...' },
      { key: 'witnesses', label: 'Witnesses', type: 'textarea', placeholder: 'Names and roles of any witnesses' },
      { key: 'rootCause', label: 'Preliminary Root Cause', type: 'textarea', placeholder: 'What conditions or behaviors contributed to this incident?' },
      { key: 'preventiveMeasures', label: 'Recommended Preventive Measures', type: 'textarea', placeholder: 'What changes would prevent recurrence?' },
    ],
  },
  trainingPlan: {
    key: 'trainingPlan',
    label: 'Training Plan Generator',
    description: 'Create phased onboarding and training plans for new accounts or staff',
    icon: 'GraduationCap',
    path: '/tools/training-plan',
    agentKey: 'trainingPlan',
    actionKey: 'generateTrainingPlan',
    outputFormat: 'pdf',
    customComponent: false,
    intakeSchema: [
      { key: 'siteName', label: 'Site / Location', type: 'text', required: true, placeholder: 'e.g., Westbridge University — Main Campus' },
      { key: 'planType', label: 'Plan Type', type: 'select', options: ['New Account Onboarding', 'New Employee Orientation', 'Skill Development', 'Compliance Recertification', 'Service Line Expansion'], required: true },
      { key: 'targetAudience', label: 'Target Audience', type: 'text', required: true, placeholder: 'e.g., 12 new janitorial staff + 2 site supervisors' },
      { key: 'serviceLines', label: 'Service Lines Covered', type: 'checkboxGroup', options: ['Janitorial', 'Grounds Maintenance', 'MEP', 'Event Support', 'Snow & Ice'] },
      { key: 'duration', label: 'Training Duration', type: 'select', options: ['1 week', '2 weeks', '30 days', '60 days', '90 days'] },
      { key: 'startDate', label: 'Training Start Date', type: 'date' },
      { key: 'complianceRequirements', label: 'Compliance / Certification Requirements', type: 'textarea', placeholder: 'OSHA, bloodborne pathogens, chemical handling, site-specific clearances...' },
      { key: 'siteSpecifics', label: 'Site-Specific Considerations', type: 'textarea', placeholder: 'Access control, equipment orientation, client protocols, union rules...' },
      { key: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Language needs, shift-specific training, technology training (apps, reporting tools)...' },
    ],
  },
};

/** Get a tool config by key */
export function getTool(key) {
  return TOOL_REGISTRY[key] || null;
}

/** Get all tools (as array) */
export function getAllTools() {
  return Object.values(TOOL_REGISTRY);
}

/** Get only generic (non-custom) tools */
export function getGenericTools() {
  return Object.values(TOOL_REGISTRY).filter(t => !t.customComponent);
}
