/**
 * Static data for the tenant onboarding flow.
 * Industry-specific defaults for departments, services, and differentiators.
 */

export const INDUSTRIES = [
  'Building Services / Facility Management',
  'Commercial Real Estate',
  'Healthcare',
  'Education — Higher Ed',
  'Education — K-12',
  'Government',
  'Manufacturing',
  'Technology',
  'Financial Services',
  'Retail',
  'Hospitality',
  'Transportation & Logistics',
  'Energy & Utilities',
  'Construction',
  'Non-Profit',
  'Other',
];

export const EMPLOYEE_COUNT_OPTIONS = [
  '1-50',
  '51-200',
  '201-500',
  '501-1,000',
  '1,001-5,000',
  '5,000+',
];

export const OWNERSHIP_MODELS = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
  { value: 'esop', label: 'Employee-Owned (ESOP)' },
  { value: 'family', label: 'Family-Owned' },
  { value: 'pe', label: 'Private Equity-Backed' },
  { value: 'nonprofit', label: 'Non-Profit' },
];

/**
 * Common department templates. Each industry maps to a subset of these.
 */
const ALL_DEPARTMENTS = {
  operations: { name: 'Operations', description: 'Day-to-day operational management', icon: 'clipboard-list', color: '#009ADE' },
  hr: { name: 'Human Resources', description: 'People management, hiring, and benefits', icon: 'users', color: '#7C3AED' },
  finance: { name: 'Finance', description: 'Financial planning, budgets, and accounting', icon: 'dollar-sign', color: '#16A34A' },
  sales: { name: 'Sales', description: 'Business development and client acquisition', icon: 'trending-up', color: '#2563EB' },
  purchasing: { name: 'Purchasing', description: 'Procurement and vendor management', icon: 'shopping-cart', color: '#D97706' },
  safety: { name: 'Safety', description: 'Workplace safety and compliance', icon: 'shield', color: '#DC2626' },
  quality: { name: 'Quality', description: 'Quality assurance and inspection', icon: 'check-circle', color: '#7C3AED' },
  training: { name: 'Training', description: 'Employee development and onboarding', icon: 'book-open', color: '#0D9488' },
  it: { name: 'IT', description: 'Technology infrastructure and support', icon: 'monitor', color: '#6366F1' },
  marketing: { name: 'Marketing', description: 'Brand management and communications', icon: 'megaphone', color: '#EC4899' },
  legal: { name: 'Legal', description: 'Legal compliance and contract management', icon: 'scale', color: '#78716C' },
  facilities: { name: 'Facilities', description: 'Building and grounds management', icon: 'building', color: '#0891B2' },
  logistics: { name: 'Logistics', description: 'Supply chain and distribution', icon: 'truck', color: '#EA580C' },
  engineering: { name: 'Engineering', description: 'Technical engineering and maintenance', icon: 'wrench', color: '#4F46E5' },
  customer_service: { name: 'Customer Service', description: 'Client support and satisfaction', icon: 'headphones', color: '#059669' },
};

const INDUSTRY_DEPARTMENTS = {
  'Building Services / Facility Management': ['operations', 'hr', 'finance', 'sales', 'purchasing', 'safety', 'quality', 'training'],
  'Commercial Real Estate': ['operations', 'hr', 'finance', 'sales', 'facilities', 'legal'],
  'Healthcare': ['operations', 'hr', 'finance', 'quality', 'safety', 'it', 'facilities'],
  'Education — Higher Ed': ['operations', 'hr', 'finance', 'facilities', 'safety', 'it'],
  'Education — K-12': ['operations', 'hr', 'finance', 'facilities', 'safety'],
  'Government': ['operations', 'hr', 'finance', 'purchasing', 'legal', 'it'],
  'Manufacturing': ['operations', 'hr', 'finance', 'purchasing', 'safety', 'quality', 'engineering', 'logistics'],
  'Technology': ['operations', 'hr', 'finance', 'sales', 'engineering', 'it', 'marketing'],
  'Financial Services': ['operations', 'hr', 'finance', 'sales', 'it', 'legal', 'marketing'],
  'Retail': ['operations', 'hr', 'finance', 'sales', 'purchasing', 'logistics', 'marketing', 'customer_service'],
  'Hospitality': ['operations', 'hr', 'finance', 'sales', 'facilities', 'quality', 'customer_service'],
  'Transportation & Logistics': ['operations', 'hr', 'finance', 'safety', 'logistics', 'engineering'],
  'Energy & Utilities': ['operations', 'hr', 'finance', 'safety', 'engineering', 'legal'],
  'Construction': ['operations', 'hr', 'finance', 'purchasing', 'safety', 'quality', 'engineering'],
  'Non-Profit': ['operations', 'hr', 'finance', 'marketing', 'legal'],
};

export function getDefaultDepartments(industry) {
  const keys = INDUSTRY_DEPARTMENTS[industry] || ['operations', 'hr', 'finance', 'sales'];
  return keys.map(key => ({
    ...ALL_DEPARTMENTS[key],
    key,
    isCustom: false,
  }));
}

/**
 * Default service categories per industry.
 */
const INDUSTRY_SERVICES = {
  'Building Services / Facility Management': [
    {
      category: 'Janitorial',
      services: ['Day Porter', 'Nightly Cleaning', 'Deep Clean / Periodic', 'Event Support', 'Restroom Care'],
    },
    {
      category: 'Grounds Maintenance',
      services: ['Landscaping', 'Snow & Ice Removal', 'Irrigation Management', 'Athletic Fields', 'Parking Lot Maintenance'],
    },
    {
      category: 'MEP (Mechanical, Electrical, Plumbing)',
      services: ['Preventive Maintenance', 'Emergency Response', 'Building Systems Management', 'HVAC Service', 'Electrical Systems'],
    },
    {
      category: 'Specialty Services',
      services: ['Window Cleaning', 'Floor Care', 'Pest Control', 'Waste Management'],
    },
  ],
  'Healthcare': [
    {
      category: 'Environmental Services',
      services: ['Patient Room Cleaning', 'OR / Surgical Suite Turnover', 'Infection Prevention Protocols', 'Waste Management'],
    },
    {
      category: 'Facilities Maintenance',
      services: ['HVAC Maintenance', 'Plumbing', 'Electrical', 'Biomedical Equipment Support'],
    },
    {
      category: 'Support Services',
      services: ['Linen Management', 'Transport Services', 'Food Service Support'],
    },
  ],
  'Education — Higher Ed': [
    {
      category: 'Custodial Services',
      services: ['Classroom Cleaning', 'Dormitory Cleaning', 'Event Setup / Breakdown', 'Restroom Care'],
    },
    {
      category: 'Grounds',
      services: ['Landscaping', 'Snow Removal', 'Athletic Field Maintenance', 'Parking Management'],
    },
    {
      category: 'Maintenance',
      services: ['HVAC', 'Plumbing', 'Electrical', 'Carpentry', 'Painting'],
    },
  ],
  'Manufacturing': [
    {
      category: 'Industrial Cleaning',
      services: ['Production Area Cleaning', 'Cleanroom Maintenance', 'Waste Disposal', 'Equipment Cleaning'],
    },
    {
      category: 'Facility Maintenance',
      services: ['Preventive Maintenance', 'Equipment Repair', 'HVAC', 'Electrical'],
    },
  ],
};

export function getDefaultServiceCategories(industry) {
  return INDUSTRY_SERVICES[industry] || [
    { category: 'Core Services', services: [] },
  ];
}

/**
 * Common differentiators.
 */
const ALL_DIFFERENTIATORS = [
  { key: 'retention', label: 'High Client Retention', description: 'Long-term client relationships with high renewal rates' },
  { key: 'technology', label: 'Technology-Driven Operations', description: 'Proprietary technology platform for tracking, reporting, and optimization' },
  { key: 'esop', label: 'Employee Ownership', description: 'Employee-owned structure that aligns incentives with performance' },
  { key: 'safety_record', label: 'Strong Safety Record', description: 'Industry-leading safety metrics and compliance programs' },
  { key: 'training', label: 'Comprehensive Training Programs', description: 'Structured onboarding and ongoing professional development' },
  { key: 'quality', label: 'Quality Assurance Program', description: 'Systematic inspection and quality control processes' },
  { key: 'union', label: 'Union Workforce Expertise', description: 'Experience managing unionized workforces effectively' },
  { key: 'sustainability', label: 'Sustainability Commitment', description: 'Green cleaning, energy efficiency, and environmental responsibility' },
  { key: 'scalability', label: 'Scalable Operations', description: 'Proven ability to scale services across multiple locations' },
  { key: 'response_time', label: 'Rapid Response Time', description: 'Fast emergency response and issue resolution' },
  { key: 'compliance', label: 'Regulatory Compliance', description: 'Deep expertise in industry-specific regulatory requirements' },
  { key: 'savings', label: 'Cost Savings / Shared Savings', description: 'Demonstrable cost efficiency with transparent savings models' },
  { key: 'leadership', label: 'Stable Leadership', description: 'Long-tenured leadership team with deep industry experience' },
  { key: 'diversity', label: 'Diversity & Inclusion', description: 'Commitment to diversity, equity, and inclusion in workforce' },
  { key: 'custom_solutions', label: 'Customized Solutions', description: 'Tailored service programs designed for each client' },
];

const INDUSTRY_DIFFERENTIATORS = {
  'Building Services / Facility Management': ['retention', 'technology', 'esop', 'safety_record', 'training', 'quality', 'union', 'savings', 'leadership'],
  'Healthcare': ['compliance', 'safety_record', 'training', 'quality', 'response_time', 'technology'],
  'Manufacturing': ['safety_record', 'compliance', 'scalability', 'quality', 'training', 'technology'],
  'Education — Higher Ed': ['sustainability', 'training', 'quality', 'scalability', 'diversity', 'technology'],
};

export function getDefaultDifferentiators(industry) {
  const keys = INDUSTRY_DIFFERENTIATORS[industry];
  if (keys) {
    return ALL_DIFFERENTIATORS.filter(d => keys.includes(d.key)).map(d => ({ ...d, isCustom: false }));
  }
  // For industries without specific defaults, return a general subset
  return ALL_DIFFERENTIATORS.slice(0, 8).map(d => ({ ...d, isCustom: false }));
}

/**
 * Icon options for department picker.
 */
export const ICON_OPTIONS = [
  { value: 'clipboard-list', label: 'Clipboard' },
  { value: 'users', label: 'Users' },
  { value: 'dollar-sign', label: 'Dollar' },
  { value: 'trending-up', label: 'Trending' },
  { value: 'shopping-cart', label: 'Cart' },
  { value: 'shield', label: 'Shield' },
  { value: 'check-circle', label: 'Check' },
  { value: 'book-open', label: 'Book' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'megaphone', label: 'Megaphone' },
  { value: 'scale', label: 'Scale' },
  { value: 'building', label: 'Building' },
  { value: 'truck', label: 'Truck' },
  { value: 'wrench', label: 'Wrench' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'hard-hat', label: 'Hard Hat' },
  { value: 'clock', label: 'Clock' },
  { value: 'alert-triangle', label: 'Alert' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
];
