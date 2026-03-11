import { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet, Upload, X, Loader2, Download,
  AlertTriangle, CheckCircle, XCircle, Users, DollarSign,
} from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function UnionBenefitsReport() {
  const { tenantId } = useTenantId();
  const fileInputRef = useRef(null);

  // Form state
  const [file, setFile] = useState(null);
  const [unions, setUnions] = useState([]);
  const [unionKey, setUnionKey] = useState('');
  const [reportMonth, setReportMonth] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [loadingUnions, setLoadingUnions] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Result state
  const [result, setResult] = useState(null);

  // Load union configs
  useEffect(() => {
    if (!tenantId) return;
    loadUnions();
  }, [tenantId]);

  async function loadUnions() {
    setLoadingUnions(true);
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/union-benefits/${tenantId}/unions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load union configs');
      const data = await res.json();
      setUnions(data);
      if (data.length === 1) setUnionKey(data[0].union_key);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUnions(false);
    }
  }

  async function handleGenerate() {
    if (!file || !unionKey || !reportMonth) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const token = await getFreshToken();
      const form = new FormData();
      form.append('timekeeping_file', file);
      form.append('union_key', unionKey);
      form.append('report_month', reportMonth);
      if (notes.trim()) form.append('notes', notes.trim());

      const res = await fetch(`${BACKEND_URL}/api/union-benefits/${tenantId}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function downloadExcel() {
    if (!result?.file) return;

    const { base64, filename, contentType } = result.file;
    const byteChars = atob(base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const ext = dropped.name.split('.').pop().toLowerCase();
      if (['xls', 'xlsx'].includes(ext)) {
        setFile(dropped);
      } else {
        setError('Only .xls and .xlsx files are accepted');
        setTimeout(() => setError(null), 3000);
      }
    }
  }

  const canGenerate = file && unionKey && reportMonth && !generating;
  const selectedUnion = unions.find(u => u.union_key === unionKey);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-aa-blue/10 rounded-lg">
          <FileSpreadsheet size={20} className="text-aa-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-light text-dark-text">Union Benefits Report</h1>
          <p className="text-sm text-secondary-text">
            Generate monthly H&W Trust and Pension payment reports from WinTeam timekeeping exports
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-5">
          {/* File Upload */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">
              WinTeam Timekeeping File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-aa-blue/50 hover:bg-gray-50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet size={16} className="text-aa-blue" />
                  <span className="text-sm text-dark-text font-medium">{file.name}</span>
                  <span className="text-xs text-secondary-text">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm text-secondary-text">Drop timekeeping export or click to upload</span>
                  <span className="text-xs text-gray-400">.xls or .xlsx</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); e.target.value = ''; }}
                className="hidden"
              />
            </div>
          </div>

          {/* Union + Month */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1.5">
                Union
              </label>
              {loadingUnions ? (
                <div className="flex items-center gap-2 text-sm text-secondary-text py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Loading unions...
                </div>
              ) : unions.length === 0 ? (
                <div className="text-sm text-secondary-text py-2">
                  No union configs found. Contact your administrator.
                </div>
              ) : (
                <select
                  value={unionKey}
                  onChange={e => setUnionKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
                >
                  <option value="">Select union...</option>
                  {unions.map(u => (
                    <option key={u.union_key} value={u.union_key}>
                      {u.union_name} — {u.trust_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1.5">
                Report Month
              </label>
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-1.5">
                Notes <span className="font-normal text-secondary-text/60">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes for this submission..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full py-3 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} />
                Generate Report
              </>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="space-y-5">
          {/* Summary Card */}
          {result?.summary && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
                  Report Summary
                </h3>
                <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <CheckCircle size={14} />
                  Generated
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-secondary-text mb-0.5">
                    <Users size={12} />
                    Employees
                  </div>
                  <div className="text-lg font-semibold text-dark-text">{result.summary.employeeCount}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-secondary-text mb-0.5">Jobs</div>
                  <div className="text-lg font-semibold text-dark-text">{result.summary.jobCount}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-secondary-text mb-0.5">Reg Hours</div>
                  <div className="text-lg font-semibold text-dark-text">
                    {result.summary.totalRegHours.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-secondary-text mb-0.5">Vac Hours</div>
                  <div className="text-lg font-semibold text-dark-text">
                    {result.summary.totalVacHours.toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-0.5">
                    <DollarSign size={12} />
                    Est. H&W
                  </div>
                  <div className="text-lg font-semibold text-blue-700">
                    ${result.summary.estimatedHW.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-500">@ ${result.summary.hwRate}/hr</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-0.5">
                    <DollarSign size={12} />
                    Est. Pension
                  </div>
                  <div className="text-lg font-semibold text-blue-700">
                    ${result.summary.estimatedPension.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-500">@ ${result.summary.pensionRate}/hr</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-secondary-text">
                {result.summary.unionName} — {result.summary.trustName}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result?.warnings?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" />
                Warnings ({result.warnings.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`text-xs px-3 py-2 rounded-lg ${
                      w.type === 'negative_hours'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : w.type === 'zero_hours'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : w.type === 'below_minimum'
                        ? 'bg-orange-50 text-orange-700 border border-orange-100'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                    }`}
                  >
                    <span className="font-medium">{w.empName || w.empId}</span>
                    {w.type === 'zero_hours' && ' — 0 total hours'}
                    {w.type === 'negative_hours' && ` — negative hours (${w.hours})`}
                    {w.type === 'low_hours' && ` — low hours (${w.hours})`}
                    {w.type === 'below_minimum' && ` — below ${w.minimum}hr minimum (${w.hours})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download */}
          {result?.file && (
            <button
              onClick={downloadExcel}
              className="w-full py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Download {result.file.filename}
            </button>
          )}

          {/* Empty state */}
          {!result && !generating && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <FileSpreadsheet size={32} className="text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-secondary-text">
                Upload a WinTeam timekeeping file and select a union to generate the report.
              </div>
              <div className="text-xs text-secondary-text mt-2">
                The report includes live Excel formulas — enter FMLA adjustments in column E before submitting.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
