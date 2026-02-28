export const contracts = [
  {
    id: 'c-001',
    client: 'Greystone Properties',
    site: 'Meridian Tower, Manhattan',
    contractStart: '2024-01-01',
    contractEnd: '2026-12-31',
    status: 'active',
    apcMonthly: 168000,
    apcAnnual: 2016000,
    apcPriorYear: 1944000,
    tbiYtd: 185000,
    tbiPending: 24000,
    serviceType: 'integrated',
    accountManager: 'Carlos Rivera',
  },
  {
    id: 'c-002',
    client: 'Westmark Realty',
    site: 'Meridian Commons, White Plains',
    contractStart: '2023-07-01',
    contractEnd: '2026-06-30',
    status: 'active',
    apcMonthly: 72000,
    apcAnnual: 864000,
    apcPriorYear: 836000,
    tbiYtd: 54000,
    tbiPending: 8500,
    serviceType: 'janitorial',
    accountManager: 'Sarah Chen',
  },
  {
    id: 'c-003',
    client: 'Harborpoint Development',
    site: 'Meridian Park Campus, Stamford',
    contractStart: '2022-06-01',
    contractEnd: '2026-04-28',
    status: 'expiringSoon',
    apcMonthly: 45000,
    apcAnnual: 540000,
    apcPriorYear: 522000,
    tbiYtd: 31000,
    tbiPending: 6200,
    serviceType: 'janitorial',
    accountManager: 'Sarah Chen',
  },
  {
    id: 'c-004',
    client: 'Hudson Valley Medical Center',
    site: 'Main Hospital Campus, Valhalla',
    contractStart: '2024-04-01',
    contractEnd: '2027-03-31',
    status: 'active',
    apcMonthly: 95000,
    apcAnnual: 1140000,
    apcPriorYear: 1104000,
    tbiYtd: 78000,
    tbiPending: 12000,
    serviceType: 'janitorial',
    accountManager: 'Carlos Rivera',
  },
  {
    id: 'c-005',
    client: 'Fairfield University',
    site: 'Main Campus, Fairfield',
    contractStart: '2023-09-01',
    contractEnd: '2026-08-31',
    status: 'active',
    apcMonthly: 134000,
    apcAnnual: 1608000,
    apcPriorYear: 1554000,
    tbiYtd: 112000,
    tbiPending: 18000,
    serviceType: 'integrated',
    accountManager: 'Carlos Rivera',
  },
  {
    id: 'c-006',
    client: 'Rockland County Government Center',
    site: 'County Complex, New City',
    contractStart: '2021-10-01',
    contractEnd: '2026-03-31',
    status: 'inRenewal',
    apcMonthly: 58000,
    apcAnnual: 696000,
    apcPriorYear: 672000,
    tbiYtd: 46000,
    tbiPending: 9500,
    serviceType: 'janitorial',
    accountManager: 'Sarah Chen',
  },
  {
    id: 'c-007',
    client: 'Sterling Corporate Park',
    site: 'Sterling Corporate Park, Rye Brook',
    contractStart: '2024-06-01',
    contractEnd: '2027-05-31',
    status: 'active',
    apcMonthly: 42000,
    apcAnnual: 504000,
    apcPriorYear: 486000,
    tbiYtd: 28000,
    tbiPending: 0,
    serviceType: 'grounds',
    accountManager: 'Carlos Rivera',
  },
  {
    id: 'c-008',
    client: 'Northshore Retirement Community',
    site: 'Northshore Campus, Mamaroneck',
    contractStart: '2023-01-01',
    contractEnd: '2026-04-12',
    status: 'expiringSoon',
    apcMonthly: 38000,
    apcAnnual: 456000,
    apcPriorYear: 441000,
    tbiYtd: 22000,
    tbiPending: 4800,
    serviceType: 'janitorial',
    accountManager: 'Sarah Chen',
  },
];

export function daysUntilExpiry(contractEnd) {
  const end = new Date(contractEnd);
  const now = new Date();
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getUrgencyTier(contractEnd) {
  const days = daysUntilExpiry(contractEnd);
  if (days < 0) return { tier: 'expired', color: '#9CA3AF', label: 'Expired' };
  if (days < 30) return { tier: 'red', color: '#DC2626', label: `${days}d` };
  if (days <= 90) return { tier: 'yellow', color: '#EAB308', label: `${days}d` };
  return { tier: 'green', color: '#16A34A', label: `${days}d` };
}

export function groupByQuarter(contractsList) {
  const groups = {};
  for (const c of contractsList) {
    const end = new Date(c.contractEnd);
    const q = Math.ceil((end.getMonth() + 1) / 3);
    const key = `Q${q} ${end.getFullYear()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }
  // Sort quarter keys chronologically
  const sorted = Object.keys(groups).sort((a, b) => {
    const [qa, ya] = [parseInt(a[1]), parseInt(a.slice(3))];
    const [qb, yb] = [parseInt(b[1]), parseInt(b.slice(3))];
    return ya !== yb ? ya - yb : qa - qb;
  });
  return sorted.map((key) => ({
    label: key,
    contracts: groups[key].sort(
      (a, b) => new Date(a.contractEnd) - new Date(b.contractEnd)
    ),
    totalApc: groups[key].reduce((sum, c) => sum + c.apcAnnual, 0),
  }));
}

export function getSalesMetrics() {
  const active = contracts.filter((c) => c.status !== 'expired');
  const totalApcAnnual = active.reduce((sum, c) => sum + c.apcAnnual, 0);
  const totalTbiPending = contracts.reduce((sum, c) => sum + c.tbiPending, 0);

  const now = new Date();
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);
  const expiringSoon = contracts.filter((c) => {
    if (c.status === 'expired') return false;
    const end = new Date(c.contractEnd);
    return end >= now && end <= in90;
  });

  const inRenewal = contracts.filter((c) => c.status === 'inRenewal');

  return { totalApcAnnual, totalTbiPending, expiringSoonCount: expiringSoon.length, inRenewalCount: inRenewal.length };
}
