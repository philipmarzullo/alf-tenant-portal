import { DollarSign, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import StatusBadge from '../../components/shared/StatusBadge';
import { contracts, getSalesMetrics, daysUntilExpiry, getUrgencyTier } from '../../data/mock/salesMocks';

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

export default function SalesOverview() {
  const metrics = getSalesMetrics();

  const now = new Date();
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);

  const expiringSoon = contracts.filter((c) => {
    if (c.status === 'expired') return false;
    const end = new Date(c.contractEnd);
    return end >= now && end <= in90;
  }).sort((a, b) => new Date(a.contractEnd) - new Date(b.contractEnd));

  const inRenewal = contracts.filter((c) => c.status === 'inRenewal');
  const expired = contracts.filter((c) => c.status === 'expired');

  const METRICS = [
    { label: 'Total Annual APC', value: fmt(metrics.totalApcAnnual), icon: DollarSign },
    { label: 'TBI Pending', value: fmt(metrics.totalTbiPending), icon: Clock, color: '#EAB308' },
    { label: 'Expiring (90 days)', value: String(metrics.expiringSoonCount), icon: AlertTriangle, color: '#DC2626' },
    { label: 'In Renewal', value: String(metrics.inRenewalCount), icon: RefreshCw, color: '#009ADE' },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Expiring within 90 days */}
      {expiringSoon.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Contracts Expiring Within 90 Days
          </h2>
          <div className="space-y-2">
            {expiringSoon.map((c) => {
              const urgency = getUrgencyTier(c.contractEnd);
              const days = daysUntilExpiry(c.contractEnd);
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: urgency.color }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: urgency.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark-text">{c.client}</div>
                    <div className="text-xs text-secondary-text">{c.site}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-secondary-text">Expires</div>
                    <div className="text-sm font-medium text-dark-text">
                      {new Date(c.contractEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-20">
                    <div className="text-xs text-secondary-text">APC/mo</div>
                    <div className="text-sm font-medium text-dark-text">{fmt(c.apcMonthly)}</div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: urgency.color, backgroundColor: `${urgency.color}15` }}
                  >
                    {days}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* In Renewal */}
      {inRenewal.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            In Renewal
          </h2>
          <div className="space-y-2">
            {inRenewal.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4"
                style={{ borderLeftWidth: 3, borderLeftColor: '#009ADE' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-text">{c.client}</div>
                  <div className="text-xs text-secondary-text">{c.site}</div>
                </div>
                <div className="text-right shrink-0 w-24">
                  <div className="text-xs text-secondary-text">Annual APC</div>
                  <div className="text-sm font-medium text-dark-text">{fmt(c.apcAnnual)}</div>
                </div>
                <StatusBadge status="inRenewal" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Expired */}
      {expired.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Recently Expired
          </h2>
          <div className="space-y-2">
            {expired.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4 opacity-60"
                style={{ borderLeftWidth: 3, borderLeftColor: '#9CA3AF' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-text">{c.client}</div>
                  <div className="text-xs text-secondary-text">{c.site}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-secondary-text">Ended</div>
                  <div className="text-sm font-medium text-dark-text">
                    {new Date(c.contractEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="text-right shrink-0 w-24">
                  <div className="text-xs text-secondary-text">Was APC/yr</div>
                  <div className="text-sm font-medium text-dark-text">{fmt(c.apcAnnual)}</div>
                </div>
                <StatusBadge status="expired" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
