// ─────────────────────────────────────────────────────────────────────────────
// RFP Fact Definitions
// ─────────────────────────────────────────────────────────────────────────────
// The Facts panel is a structured knowledge base the RFP agent injects into
// every response. Each fact has a stable key, a category, a label, and an
// input type. The agent receives these as a flat block of "key: value" lines.
//
// Categories: safety_metrics | policy_flags | references | company_counts | certifications
// Input types: text | number | boolean | textarea
// ─────────────────────────────────────────────────────────────────────────────

export const FACT_DEFINITIONS = {
  safety_metrics: {
    label: 'Safety Metrics',
    description: 'Key safety performance indicators (most recent year). Update annually.',
    fields: [
      { key: 'safety.trir', label: 'TRIR (Total Recordable Incident Rate)', input: 'number', placeholder: 'e.g. 0.42', help: 'OSHA recordable incidents × 200,000 ÷ hours worked' },
      { key: 'safety.emr', label: 'EMR (Experience Modification Rate)', input: 'number', placeholder: 'e.g. 0.81' },
      { key: 'safety.dart', label: 'DART Rate', input: 'number', placeholder: 'e.g. 0.18', help: 'Days Away, Restricted, Transferred' },
      { key: 'safety.recordable_count', label: 'Recordable Incidents (most recent year)', input: 'number', placeholder: 'e.g. 3' },
      { key: 'safety.lost_time_count', label: 'Lost-Time Incidents (most recent year)', input: 'number', placeholder: 'e.g. 1' },
      { key: 'safety.hours_worked_annually', label: 'Hours Worked Annually', input: 'number', placeholder: 'e.g. 1850000' },
      { key: 'safety.fatalities_5yr', label: 'Fatalities (last 5 years)', input: 'number', placeholder: 'e.g. 0' },
    ],
  },
  policy_flags: {
    label: 'Policy Flags',
    description: 'Yes/no flags for company policies and certifications.',
    fields: [
      { key: 'policy.has_drug_policy', label: 'Drug-free workplace policy', input: 'boolean' },
      { key: 'policy.has_background_check', label: 'Background check program', input: 'boolean' },
      { key: 'policy.has_safety_program', label: 'Written safety program', input: 'boolean' },
      { key: 'policy.has_ehs_committee', label: 'EHS / Safety committee', input: 'boolean' },
      { key: 'policy.has_apprenticeship', label: 'Apprenticeship program', input: 'boolean' },
      { key: 'policy.has_training_program', label: 'Formal training program', input: 'boolean' },
      { key: 'policy.has_quality_program', label: 'Quality control / QA program', input: 'boolean' },
      { key: 'policy.is_minority_owned', label: 'Minority-owned business (MBE)', input: 'boolean' },
      { key: 'policy.is_woman_owned', label: 'Woman-owned business (WBE)', input: 'boolean' },
      { key: 'policy.is_veteran_owned', label: 'Veteran-owned business (VBE)', input: 'boolean' },
      { key: 'policy.is_small_business', label: 'Small business (SBE)', input: 'boolean' },
      { key: 'policy.is_union', label: 'Unionized workforce', input: 'boolean' },
      { key: 'policy.has_e_verify', label: 'E-Verify enrolled', input: 'boolean' },
      { key: 'policy.has_sustainability_program', label: 'Sustainability / green cleaning program', input: 'boolean' },
    ],
  },
  certifications: {
    label: 'Certifications',
    description: 'Industry certifications and accreditations the company holds.',
    fields: [
      { key: 'cert.cims', label: 'CIMS (ISSA)', input: 'boolean' },
      { key: 'cert.cims_gb', label: 'CIMS-GB (Green Building)', input: 'boolean' },
      { key: 'cert.green_seal', label: 'Green Seal', input: 'boolean' },
      { key: 'cert.iso_9001', label: 'ISO 9001', input: 'boolean' },
      { key: 'cert.iso_14001', label: 'ISO 14001', input: 'boolean' },
      { key: 'cert.osha_30', label: 'OSHA 30-hour trained supervisors', input: 'boolean' },
      { key: 'cert.ehap', label: 'EHAP (Environmental Hazard Awareness)', input: 'boolean' },
      { key: 'cert.bicsc', label: 'BICSc trained', input: 'boolean' },
      { key: 'cert.other', label: 'Other certifications', input: 'textarea', placeholder: 'List any additional certifications' },
    ],
  },
  references: {
    label: 'Reference Contacts',
    description: 'Verified client references the agent can cite. Keep 3–5 current.',
    fields: [
      // Reference 1
      { key: 'ref.1.name', label: 'Reference 1 — Client name', input: 'text', placeholder: 'Hartford Public Schools' },
      { key: 'ref.1.contact', label: 'Reference 1 — Contact name', input: 'text' },
      { key: 'ref.1.title', label: 'Reference 1 — Contact title', input: 'text' },
      { key: 'ref.1.phone', label: 'Reference 1 — Phone', input: 'text' },
      { key: 'ref.1.email', label: 'Reference 1 — Email', input: 'text' },
      { key: 'ref.1.scope', label: 'Reference 1 — Scope (sq ft / sites / services)', input: 'textarea' },
      { key: 'ref.1.years', label: 'Reference 1 — Years of service', input: 'text' },
      // Reference 2
      { key: 'ref.2.name', label: 'Reference 2 — Client name', input: 'text' },
      { key: 'ref.2.contact', label: 'Reference 2 — Contact name', input: 'text' },
      { key: 'ref.2.title', label: 'Reference 2 — Contact title', input: 'text' },
      { key: 'ref.2.phone', label: 'Reference 2 — Phone', input: 'text' },
      { key: 'ref.2.email', label: 'Reference 2 — Email', input: 'text' },
      { key: 'ref.2.scope', label: 'Reference 2 — Scope', input: 'textarea' },
      { key: 'ref.2.years', label: 'Reference 2 — Years of service', input: 'text' },
      // Reference 3
      { key: 'ref.3.name', label: 'Reference 3 — Client name', input: 'text' },
      { key: 'ref.3.contact', label: 'Reference 3 — Contact name', input: 'text' },
      { key: 'ref.3.title', label: 'Reference 3 — Contact title', input: 'text' },
      { key: 'ref.3.phone', label: 'Reference 3 — Phone', input: 'text' },
      { key: 'ref.3.email', label: 'Reference 3 — Email', input: 'text' },
      { key: 'ref.3.scope', label: 'Reference 3 — Scope', input: 'textarea' },
      { key: 'ref.3.years', label: 'Reference 3 — Years of service', input: 'text' },
    ],
  },
  company_counts: {
    label: 'Company Counts',
    description: 'Headline numbers about the company.',
    fields: [
      { key: 'count.employees_total', label: 'Total employees', input: 'number' },
      { key: 'count.employees_ft', label: 'Full-time employees', input: 'number' },
      { key: 'count.employees_pt', label: 'Part-time employees', input: 'number' },
      { key: 'count.years_in_business', label: 'Years in business', input: 'number' },
      { key: 'count.year_founded', label: 'Year founded', input: 'number', placeholder: 'e.g. 2003' },
      { key: 'count.locations', label: 'Office locations', input: 'number' },
      { key: 'count.states_served', label: 'States served', input: 'number' },
      { key: 'count.fleet_vehicles', label: 'Fleet vehicles', input: 'number' },
      { key: 'count.active_clients', label: 'Active clients', input: 'number' },
      { key: 'count.annual_revenue', label: 'Annual revenue (USD)', input: 'text', placeholder: 'e.g. $25M' },
      { key: 'count.sq_ft_managed', label: 'Square feet under management', input: 'text', placeholder: 'e.g. 5.2M sq ft' },
      { key: 'count.daily_clients', label: 'Daily clients/sites serviced', input: 'number' },
    ],
  },
};

// ─── A&A Elevated Facility Solutions defaults ────────────────────────────────
// Used to seed the Facts panel for A&A. Other tenants start blank.
export const A_AND_A_DEFAULTS = {
  // Safety metrics — verified from latest QBR data
  'safety.emr': '0.81',
  'safety.trir': '0.42',
  'safety.dart': '0.18',

  // Policy flags
  'policy.has_drug_policy': 'true',
  'policy.has_background_check': 'true',
  'policy.has_safety_program': 'true',
  'policy.has_ehs_committee': 'true',
  'policy.has_training_program': 'true',
  'policy.has_quality_program': 'true',
  'policy.has_e_verify': 'true',
  'policy.has_sustainability_program': 'true',
  'policy.is_woman_owned': 'true',

  // Certifications
  'cert.osha_30': 'true',

  // Company counts
  'count.year_founded': '2003',
};
