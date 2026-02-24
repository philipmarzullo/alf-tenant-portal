export const vpSummary = [
  {
    id: 'CR',
    vp: 'Carlos Rivera',
    initials: 'CR',
    jobCount: 156,
    revenueInspectedSafety: 89.9,
    safetyInspections: 202,
    revenueInspectedCommercial: 93.0,
    commercialInspections: 263,
    sitesWithDeficiencies: 119,
    incidents: 2,
    goodSaves: 5,
    compliments: 2,
    avgDeficiencyClosedDays: 1.4,
  },
  {
    id: 'EG',
    vp: 'Edita Gargovic',
    initials: 'EG',
    jobCount: 15,
    revenueInspectedSafety: 94.2,
    safetyInspections: 28,
    revenueInspectedCommercial: 96.1,
    commercialInspections: 31,
    sitesWithDeficiencies: 8,
    incidents: 0,
    goodSaves: 1,
    compliments: 3,
    avgDeficiencyClosedDays: 0.9,
  },
  {
    id: 'EQ',
    vp: 'Elgar Quijandria',
    initials: 'EQ',
    jobCount: 51,
    revenueInspectedSafety: 91.5,
    safetyInspections: 74,
    revenueInspectedCommercial: 88.7,
    commercialInspections: 92,
    sitesWithDeficiencies: 34,
    incidents: 1,
    goodSaves: 3,
    compliments: 1,
    avgDeficiencyClosedDays: 1.8,
  },
  {
    id: 'EW',
    vp: 'Eric Wheeler',
    initials: 'EW',
    jobCount: 204,
    revenueInspectedSafety: 86.3,
    safetyInspections: 278,
    revenueInspectedCommercial: 91.4,
    commercialInspections: 340,
    sitesWithDeficiencies: 157,
    incidents: 4,
    goodSaves: 7,
    compliments: 5,
    avgDeficiencyClosedDays: 2.1,
  },
  {
    id: 'JR',
    vp: 'Jaimie Restrepo',
    initials: 'JR',
    jobCount: 152,
    revenueInspectedSafety: 92.8,
    safetyInspections: 189,
    revenueInspectedCommercial: 95.2,
    commercialInspections: 247,
    sitesWithDeficiencies: 98,
    incidents: 1,
    goodSaves: 4,
    compliments: 4,
    avgDeficiencyClosedDays: 1.2,
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
