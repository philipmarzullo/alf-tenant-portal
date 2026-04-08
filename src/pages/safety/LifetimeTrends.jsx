// ============================================================================
// LifetimeTrends — "Since 2008" panel for the Safety dashboard
// ----------------------------------------------------------------------------
// Reads from /api/wc-claims/lifetime, which serves the wc_claims_lifetime_summary
// row seeded from the historical dashboard report. This is static aggregate
// data — not derived from wc_claims rows — so it gives the executive lifetime
// picture (claims since 2008, top sites, top injury types) that we can't
// reconstruct from the open + recent-closed data we have today.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  TrendingUp, DollarSign, Activity, AlertOctagon, Loader2, Archive,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { getLifetimeSummary } from './wcClaimsApi';

const BAR_COLOR = '#009ADE';
const RED = '#DC2626';
const GREEN = '#16A34A';

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '$0';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtMoneyFull(n) {
  if (n == null) return '$0';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value, icon: Icon, color = '#1B2133', sublabel }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-secondary-text uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
      <div className="text-3xl font-light text-dark-text tabular-nums">{value}</div>
      {sublabel && <div className="text-xs text-secondary-text mt-1">{sublabel}</div>}
    </div>
  );
}

export default function LifetimeTrends() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLifetimeSummary()
      .then(d => { if (!cancelled) setSummary(d.summary); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 flex items-center justify-center">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <Archive size={28} className="mx-auto mb-3 text-secondary-text" />
        <h3 className="text-base font-medium text-dark-text mb-1">No lifetime data yet</h3>
        <p className="text-sm text-secondary-text">
          Run <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">node scripts/seed-wc-claims-lifetime.mjs</code> to populate the historical summary.
        </p>
      </div>
    );
  }

  const claimsByYear = summary.claims_by_year || [];
  const topSites = summary.top_sites || [];
  const topInjuryTypes = summary.top_injury_types || [];
  const topCostClaims = summary.top_cost_claims || [];

  const periodLabel =
    summary.period_start_year && summary.period_end_year
      ? `${summary.period_start_year}–${summary.period_end_year}`
      : 'Historical';

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-end justify-between border-t-2 border-gray-200 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-dark-text flex items-center gap-2">
            <Archive size={18} className="text-secondary-text" />
            Lifetime Trends ({periodLabel})
          </h2>
          <p className="text-xs text-secondary-text mt-1">
            Historical aggregates from Liberty's lifetime loss-run report. Source: {summary.source_file || 'historical dashboard'}.
          </p>
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime Claims"
          value={(summary.total_claims || 0).toLocaleString()}
          icon={TrendingUp}
          sublabel={periodLabel}
        />
        <StatCard
          label="Total Incurred"
          value={fmtMoney(summary.total_incurred)}
          icon={DollarSign}
          sublabel={fmtMoneyFull(summary.total_incurred)}
        />
        <StatCard
          label="Avg Claim Cost"
          value={fmtMoney(summary.average_claim_cost)}
          icon={Activity}
        />
        <StatCard
          label="Highest Claim"
          value={fmtMoney(summary.highest_claim_cost)}
          icon={AlertOctagon}
          color={RED}
        />
      </div>

      {/* Time series row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">Claims by Year</h3>
          <p className="text-xs text-secondary-text mb-3">Annual claim count, lifetime</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={claimsByYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">Cost by Year</h3>
          <p className="text-xs text-secondary-text mb-3">Total incurred per year, lifetime</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={claimsByYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtMoney} />
              <Tooltip formatter={(v) => fmtMoneyFull(v)} />
              <Line type="monotone" dataKey="incurred" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">Top Sites (Lifetime)</h3>
          <p className="text-xs text-secondary-text mb-3">Sites with the most claims since {summary.period_start_year || '2008'}</p>
          <div className="space-y-2 mt-2 max-h-[260px] overflow-y-auto">
            {topSites.length === 0 && (
              <p className="text-sm text-secondary-text text-center py-4">No site data</p>
            )}
            {topSites.map((s) => {
              const max = topSites[0]?.count || 1;
              const pct = (s.count / max) * 100;
              return (
                <div key={s.job_name} className="px-2 py-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-dark-text font-medium truncate mr-2 max-w-[220px]">{s.job_name}</span>
                    <span className="text-secondary-text tabular-nums">{s.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: BAR_COLOR }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">Top Injury Types (Lifetime)</h3>
          <p className="text-xs text-secondary-text mb-3">Most common injury natures since {summary.period_start_year || '2008'}</p>
          <div className="space-y-2 mt-2 max-h-[260px] overflow-y-auto">
            {topInjuryTypes.length === 0 && (
              <p className="text-sm text-secondary-text text-center py-4">No injury data</p>
            )}
            {topInjuryTypes.map((it) => {
              const max = topInjuryTypes[0]?.count || 1;
              const pct = (it.count / max) * 100;
              return (
                <div key={it.name} className="px-2 py-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-dark-text font-medium truncate mr-2 max-w-[220px]">{it.name}</span>
                    <span className="text-secondary-text tabular-nums">{it.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: GREEN }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top cost claims table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-dark-text">Top Cost Claims (Lifetime)</h3>
          <p className="text-xs text-secondary-text mt-0.5">Highest-severity historical claims since {summary.period_start_year || '2008'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Claim #</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Claimant</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Site</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Injury</th>
                <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs">Total Incurred</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topCostClaims.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-secondary-text">No top-cost claims</td>
                </tr>
              )}
              {topCostClaims.map((c) => (
                <tr key={c.claim_number} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-dark-text font-medium whitespace-nowrap">{c.claim_number}</td>
                  <td className="px-3 py-2 text-dark-text">{c.claimant || '—'}</td>
                  <td className="px-3 py-2 text-dark-text truncate max-w-[240px]">{c.job_name || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.injury || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-dark-text">{fmtMoneyFull(c.total_incurred)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
