export const vpSummary = [
  {
    id: 'CR',
    vp: 'Carlos Rivera',
    initials: 'CR',
    jobCount: 12,
    revenueInspectedSafety: 91.4,
    safetyInspections: 48,
    revenueInspectedCommercial: 94.2,
    commercialInspections: 56,
    sitesWithDeficiencies: 7,
    incidents: 1,
    goodSaves: 3,
    compliments: 4,
    avgDeficiencyClosedDays: 1.6,
  },
  {
    id: 'SC',
    vp: 'Sarah Chen',
    initials: 'SC',
    jobCount: 8,
    revenueInspectedSafety: 94.8,
    safetyInspections: 31,
    revenueInspectedCommercial: 96.5,
    commercialInspections: 34,
    sitesWithDeficiencies: 3,
    incidents: 0,
    goodSaves: 2,
    compliments: 3,
    avgDeficiencyClosedDays: 1.1,
  },
  {
    id: 'MT',
    vp: 'Michael Torres',
    initials: 'MT',
    jobCount: 5,
    revenueInspectedSafety: 97.2,
    safetyInspections: 19,
    revenueInspectedCommercial: 98.1,
    commercialInspections: 21,
    sitesWithDeficiencies: 1,
    incidents: 0,
    goodSaves: 1,
    compliments: 2,
    avgDeficiencyClosedDays: 0.7,
  },
];

export function getOpsSummaryMetrics() {
  const totalJobs = vpSummary.reduce((sum, vp) => sum + vp.jobCount, 0);
  const totalIncidents = vpSummary.reduce((sum, vp) => sum + vp.incidents, 0);
  const totalDeficiencySites = vpSummary.reduce((sum, vp) => sum + vp.sitesWithDeficiencies, 0);
  const totalGoodSaves = vpSummary.reduce((sum, vp) => sum + vp.goodSaves, 0);
  const totalCompliments = vpSummary.reduce((sum, vp) => sum + vp.compliments, 0);

  // Weighted average safety inspection rate (weighted by job count)
  const totalJobsForWeight = vpSummary.reduce((sum, vp) => sum + vp.jobCount, 0);
  const avgSafetyRate = vpSummary.reduce(
    (sum, vp) => sum + vp.revenueInspectedSafety * (vp.jobCount / totalJobsForWeight), 0
  );

  const avgCommercialRate = vpSummary.reduce(
    (sum, vp) => sum + vp.revenueInspectedCommercial * (vp.jobCount / totalJobsForWeight), 0
  );

  const avgCloseDays = vpSummary.reduce((sum, vp) => sum + vp.avgDeficiencyClosedDays, 0) / vpSummary.length;

  return {
    totalJobs,
    avgSafetyRate: Math.round(avgSafetyRate * 10) / 10,
    avgCommercialRate: Math.round(avgCommercialRate * 10) / 10,
    totalIncidents,
    totalDeficiencySites,
    totalGoodSaves,
    totalCompliments,
    avgCloseDays: Math.round(avgCloseDays * 10) / 10,
  };
}
