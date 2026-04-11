import { useState, useEffect, useCallback } from 'react';
import { getFreshToken } from '../lib/supabase';
import { useTenantId } from '../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

async function apiFetch(path, token) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/**
 * Fetches Command Center data from live ops-workspace endpoints.
 * Returns { data, loading, error, refetch }.
 *
 * data shape matches what Dashboard.jsx expects:
 *   hero: { overtimePct, openDeficiencies, avgInspectionScore, openClaims, ... }
 *   domains: { operations, labor, quality, safety }
 *   attentionItems: [{ id, priority, dept, description, detail, actionLabel }]
 *   hasData: boolean
 */
export default function useHomeSummary() {
  const { tenantId } = useTenantId();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      setError('Tenant ID not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const base = `/api/ops-workspace/${tenantId}`;

      const [wf, ql, fin, sf] = await Promise.all([
        apiFetch(`${base}/workforce-kpis`, token),
        apiFetch(`${base}/quality-kpis`, token),
        apiFetch(`${base}/financial-kpis`, token),
        apiFetch(`${base}/safety-kpis`, token),
      ]);

      // Build hero metrics
      const hero = {
        // Workforce / Labor
        activeHeadcount: wf.activeHeadcount,
        overtimePct: wf.overtimePct,
        turnoverRate: wf.turnoverRate,
        totalHours: wf.totalHours,
        // Quality
        avgInspectionScore: ql.avgScore,
        openDeficiencies: ql.openDeficiencies,
        totalInspections: ql.totalInspections,
        sitesBelowObjective: ql.sitesBelowObjective,
        // Financial
        totalPayroll: fin.totalPayroll,
        laborVariance: fin.laborVariancePct,
        otPay: fin.otPay,
        // Safety
        openClaims: sf.openClaims,
        outOfWork: sf.outOfWork,
        totalIncurred: sf.totalIncurred,
        recordableIncidents: sf.recordableIncidents,
      };

      // Domain summaries
      const domains = {
        operations: {
          hasData: ql.totalInspections > 0,
          stats: [
            `${ql.totalInspections.toLocaleString()} inspections`,
            `${ql.avgScore}% avg score`,
            `${ql.openDeficiencies} open deficiencies`,
          ],
        },
        labor: {
          hasData: fin.hasPayrollData,
          stats: [
            `$${fin.totalPayroll.toLocaleString()} payroll`,
            `${wf.activeHeadcount} active headcount`,
            `${wf.overtimePct}% overtime`,
          ],
        },
        quality: {
          hasData: ql.totalInspections > 0,
          stats: [
            `${ql.avgScore}% avg inspection score`,
            `${ql.sitesBelowObjective} sites below objective`,
            `${ql.totalDeficiencies} total deficiencies`,
          ],
        },
        safety: {
          hasData: sf.hasData,
          stats: [
            `${sf.openClaims} open claims`,
            `${sf.outOfWork} out of work`,
            `$${sf.totalIncurred.toLocaleString()} total incurred`,
          ],
        },
      };

      // Attention items
      const attentionItems = [];
      let taskId = 0;

      if (wf.overtimePct > 15) {
        attentionItems.push({
          id: ++taskId,
          priority: wf.overtimePct > 25 ? 'high' : 'medium',
          dept: 'labor',
          description: `Overtime at ${wf.overtimePct}%`,
          detail: `${wf.totalHours.toLocaleString()} total hours`,
          actionLabel: 'Review',
        });
      }
      if (wf.turnoverRate > 10 && wf.hasTurnoverData) {
        attentionItems.push({
          id: ++taskId,
          priority: wf.turnoverRate > 20 ? 'high' : 'medium',
          dept: 'labor',
          description: `Turnover rate at ${wf.turnoverRate}%`,
          detail: `${wf.terminations} terminations`,
          actionLabel: 'Review',
        });
      }
      if (ql.sitesBelowObjective > 0) {
        attentionItems.push({
          id: ++taskId,
          priority: ql.sitesBelowObjective > 5 ? 'high' : 'medium',
          dept: 'quality',
          description: `${ql.sitesBelowObjective} sites below objective`,
          detail: `of ${ql.totalSitesInspected} inspected`,
          actionLabel: 'Investigate',
        });
      }
      if (ql.openDeficiencies > 0) {
        attentionItems.push({
          id: ++taskId,
          priority: ql.openDeficiencies > 20 ? 'high' : 'medium',
          dept: 'quality',
          description: `${ql.openDeficiencies} open deficiencies`,
          detail: `${ql.totalDeficiencies} total`,
          actionLabel: 'Review',
        });
      }
      if (fin.laborVariancePct > 10 && fin.hasBudgetData) {
        attentionItems.push({
          id: ++taskId,
          priority: fin.laborVariancePct > 20 ? 'high' : 'medium',
          dept: 'labor',
          description: `Labor ${fin.laborVariancePct}% over budget`,
          detail: `$${fin.totalPayroll.toLocaleString()} actual vs $${fin.budgetLaborDollars.toLocaleString()} budget`,
          actionLabel: 'Review',
        });
      }
      if (sf.openClaims > 0) {
        attentionItems.push({
          id: ++taskId,
          priority: sf.openClaims > 5 ? 'high' : 'medium',
          dept: 'safety',
          description: `${sf.openClaims} open WC claims`,
          detail: sf.outOfWork > 0 ? `${sf.outOfWork} out of work` : `$${sf.totalIncurred.toLocaleString()} incurred`,
          actionLabel: 'Investigate',
        });
      }

      attentionItems.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] || 2) - (order[b.priority] || 2);
      });

      setData({
        hero,
        domains,
        attentionItems,
        hasData: fin.hasPayrollData || ql.totalInspections > 0 || sf.hasData,
      });
    } catch (err) {
      console.error('[useHomeSummary] error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
