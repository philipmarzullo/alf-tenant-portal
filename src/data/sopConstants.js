// Common facility services departments — always shown as options
export const COMMON_DEPARTMENTS = [
  { key: 'operations', label: 'Operations' },
  { key: 'janitorial', label: 'Janitorial' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'grounds', label: 'Grounds & Landscaping' },
  { key: 'safety', label: 'Safety' },
  { key: 'quality', label: 'Quality Assurance' },
  { key: 'hr', label: 'Human Resources' },
  { key: 'finance', label: 'Finance' },
  { key: 'training', label: 'Training' },
  { key: 'purchasing', label: 'Purchasing & Supply Chain' },
  { key: 'environmental', label: 'Environmental Services' },
  { key: 'admin', label: 'Administration' },
];

// SOP roles — what the SOP does within a department
export const SOP_ROLES = [
  { key: 'standard-procedure', label: 'Standard Procedure' },
  { key: 'training-guide', label: 'Training Guide' },
  { key: 'safety-protocol', label: 'Safety Protocol' },
  { key: 'compliance', label: 'Compliance & Regulatory' },
  { key: 'quality-control', label: 'Quality Control' },
  { key: 'emergency-response', label: 'Emergency Response' },
  { key: 'equipment-operation', label: 'Equipment Operation' },
  { key: 'inspection-checklist', label: 'Inspection Checklist' },
  { key: 'onboarding', label: 'Onboarding / Orientation' },
  { key: 'vendor-management', label: 'Vendor / Subcontractor' },
];

/**
 * Merge common departments with tenant workspaces (deduplicated).
 */
export function buildDepartmentList(workspaces = []) {
  const seen = new Set();
  const merged = [];
  for (const d of COMMON_DEPARTMENTS) {
    seen.add(d.key);
    merged.push(d);
  }
  for (const ws of workspaces) {
    if (!seen.has(ws.department_key)) {
      seen.add(ws.department_key);
      merged.push({ key: ws.department_key, label: ws.name });
    }
  }
  return merged;
}
