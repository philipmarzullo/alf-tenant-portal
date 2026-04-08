import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Edit2, Save, Trash2, AlertCircle } from 'lucide-react';
import { getClaim, createClaim, updateClaim, deleteClaim } from './wcClaimsApi';

const EMPTY_CLAIM = {
  claim_number: '',
  date_of_loss: '',
  date_reported: '',
  claim_status: 'Open',
  work_status: '',
  ee_status: '',
  // Employee
  employee_name: '',
  employee_id: '',
  hire_date: '',
  date_of_birth: '',
  gender: '',
  occupation: '',
  // Job/site
  job_number: '',
  job_name: '',
  vp: '',
  accident_state: '',
  accident_city: '',
  accident_address: '',
  // Injury
  catalyst: '',
  nature_of_injury: '',
  injury_cause: '',
  part_of_body: '',
  accident_description: '',
  // Financials
  incurred_medical: '',
  incurred_indemnity: '',
  incurred_expense: '',
  total_incurred: '',
  paid_medical: '',
  paid_indemnity: '',
  paid_expense: '',
  total_paid: '',
  outstanding_reserve: '',
  // Case mgmt
  claim_stage: '',
  next_action: '',
  claim_concerns: '',
  case_manager: '',
  case_manager_email: '',
  case_manager_phone: '',
  rtw_date: '',
  notes: '',
};

const SECTIONS = [
  {
    title: 'Claim Identity',
    fields: [
      { key: 'claim_number', label: 'Claim #', type: 'text' },
      { key: 'date_of_loss', label: 'Date of Loss', type: 'date' },
      { key: 'date_reported', label: 'Date Reported', type: 'date' },
      { key: 'claim_status', label: 'Claim Status', type: 'select', options: ['Open', 'Closed', 'Non-Reportable'] },
      { key: 'work_status', label: 'Work Status', type: 'text', placeholder: 'e.g., Out of Work, Light Duty, Full Duty' },
      { key: 'ee_status', label: 'EE Status', type: 'text' },
    ],
  },
  {
    title: 'Employee',
    fields: [
      { key: 'employee_name', label: 'Name', type: 'text' },
      { key: 'employee_id', label: 'Employee ID', type: 'text' },
      { key: 'occupation', label: 'Occupation', type: 'text' },
      { key: 'hire_date', label: 'Hire Date', type: 'date' },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { key: 'gender', label: 'Gender', type: 'text' },
    ],
  },
  {
    title: 'Job / Site',
    fields: [
      { key: 'job_number', label: 'Job #', type: 'text' },
      { key: 'job_name', label: 'Job Name', type: 'text' },
      { key: 'vp', label: 'VP', type: 'text' },
      { key: 'accident_state', label: 'State', type: 'text' },
      { key: 'accident_city', label: 'City', type: 'text' },
      { key: 'accident_address', label: 'Address', type: 'text' },
    ],
  },
  {
    title: 'Injury Detail',
    fields: [
      { key: 'catalyst', label: 'Catalyst', type: 'text' },
      { key: 'nature_of_injury', label: 'Nature of Injury', type: 'text' },
      { key: 'injury_cause', label: 'Cause', type: 'text' },
      { key: 'part_of_body', label: 'Part of Body', type: 'text' },
      { key: 'accident_description', label: 'Description', type: 'textarea', span: 2 },
    ],
  },
  {
    title: 'Financials',
    fields: [
      { key: 'incurred_medical', label: 'Incurred — Medical', type: 'money' },
      { key: 'incurred_indemnity', label: 'Incurred — Indemnity', type: 'money' },
      { key: 'incurred_expense', label: 'Incurred — Expense', type: 'money' },
      { key: 'total_incurred', label: 'Total Incurred', type: 'money' },
      { key: 'paid_medical', label: 'Paid — Medical', type: 'money' },
      { key: 'paid_indemnity', label: 'Paid — Indemnity', type: 'money' },
      { key: 'paid_expense', label: 'Paid — Expense', type: 'money' },
      { key: 'total_paid', label: 'Total Paid', type: 'money' },
      { key: 'outstanding_reserve', label: 'Outstanding Reserve', type: 'money' },
    ],
  },
  {
    title: 'Case Management',
    fields: [
      { key: 'claim_stage', label: 'Claim Stage', type: 'text' },
      { key: 'rtw_date', label: 'RTW Date', type: 'date' },
      { key: 'next_action', label: 'Next Action', type: 'textarea', span: 2 },
      { key: 'claim_concerns', label: 'Claim Concerns', type: 'textarea', span: 2 },
      { key: 'case_manager', label: 'Case Manager', type: 'text' },
      { key: 'case_manager_email', label: 'Case Manager Email', type: 'text' },
      { key: 'case_manager_phone', label: 'Case Manager Phone', type: 'text' },
    ],
  },
  {
    title: 'Internal Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', span: 2 },
    ],
  },
];

function fmtMoney(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function DisplayValue({ field, value }) {
  if (value == null || value === '') return <span className="text-secondary-text">—</span>;
  if (field.type === 'money') return <span className="tabular-nums">{fmtMoney(value)}</span>;
  return <span className="whitespace-pre-wrap">{value}</span>;
}

function FieldInput({ field, value, onChange }) {
  const base = 'w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-aa-blue';
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange(field.key, e.target.value)}
        rows={3}
        className={base}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select
        value={value || ''}
        onChange={e => onChange(field.key, e.target.value)}
        className={base}
      >
        <option value="">—</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'money') {
    return (
      <input
        type="number"
        step="0.01"
        value={value ?? ''}
        onChange={e => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className={`${base} tabular-nums`}
      />
    );
  }
  return (
    <input
      type={field.type}
      value={value || ''}
      onChange={e => onChange(field.key, e.target.value)}
      placeholder={field.placeholder}
      className={base}
    />
  );
}

export default function ClaimDetailDrawer({ claimId, isNew = false, onClose, onSaved }) {
  const open = !!claimId || isNew;

  const [claim, setClaim] = useState(null);
  const [form, setForm] = useState(EMPTY_CLAIM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (!open) {
      setClaim(null);
      setForm(EMPTY_CLAIM);
      setEditing(false);
      setError(null);
      setConfirmDelete(false);
      return;
    }
    if (isNew) {
      setClaim(null);
      setForm(EMPTY_CLAIM);
      setEditing(true);
      setError(null);
      return;
    }
    // Load existing claim
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEditing(false);
    getClaim(claimId)
      .then(d => {
        if (cancelled) return;
        const c = d.claim || d;
        setClaim(c);
        setForm({ ...EMPTY_CLAIM, ...c });
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [claimId, isNew, open]);

  const updateField = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Strip empty strings to null for cleaner inserts
      const payload = {};
      for (const [k, v] of Object.entries(form)) {
        payload[k] = v === '' ? null : v;
      }
      if (isNew) {
        await createClaim(payload);
      } else {
        await updateClaim(claimId, payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteClaim(claimId);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (isNew) {
      onClose();
      return;
    }
    setForm({ ...EMPTY_CLAIM, ...claim });
    setEditing(false);
    setError(null);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full md:w-[640px] bg-white shadow-2xl z-50 transform transition-transform duration-200 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-dark-text truncate">
              {isNew ? 'New Claim' : claim?.claim_number || 'Claim Detail'}
            </h2>
            {!isNew && claim?.employee_name && (
              <p className="text-xs text-secondary-text truncate">{claim.employee_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && !isNew && claim && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-aa-blue border border-aa-blue/30 rounded hover:bg-aa-blue/5"
              >
                <Edit2 size={12} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-aa-blue" />
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && (claim || isNew) && (
            <div className="space-y-6">
              {SECTIONS.map(section => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    {section.fields.map(field => (
                      <div key={field.key} className={field.span === 2 ? 'col-span-2' : ''}>
                        <label className="block text-[11px] font-medium text-secondary-text mb-0.5">
                          {field.label}
                        </label>
                        {editing ? (
                          <FieldInput field={field} value={form[field.key]} onChange={updateField} />
                        ) : (
                          <div className="text-sm text-dark-text">
                            <DisplayValue field={field} value={claim?.[field.key]} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Metadata footer */}
              {!editing && claim && (
                <div className="text-xs text-secondary-text border-t border-gray-100 pt-3 space-y-0.5">
                  {claim.source && <div>Source: <span className="text-dark-text">{claim.source}</span></div>}
                  {claim.created_at && <div>Created: <span className="text-dark-text">{new Date(claim.created_at).toLocaleString()}</span></div>}
                  {claim.updated_at && <div>Updated: <span className="text-dark-text">{new Date(claim.updated_at).toLocaleString()}</span></div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {editing && (
          <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 bg-white">
            <div>
              {!isNew && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-700">Delete this claim?</span>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={saving}
                      className="px-2 py-1 text-xs text-secondary-text hover:text-dark-text"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-3 py-1.5 text-sm text-secondary-text hover:text-dark-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isNew ? 'Create Claim' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
