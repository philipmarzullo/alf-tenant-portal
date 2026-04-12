// src/utils/opsWorkspacePdf.js
// Opens a print-ready popup window with the Executive Summary.
// User saves as PDF via the browser's native print dialog (Cmd+P → Save as PDF).
// No third-party dependencies — the browser's print engine handles all CSS.

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtNum(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toLocaleString();
}

function fmtPct(val) {
  if (val === null || val === undefined) return '—';
  return `${val}%`;
}

function fmtCurrency(val) {
  if (val === null || val === undefined) return '—';
  return `$${Number(val).toLocaleString()}`;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function scoreBadgeHtml(value, greenMin, amberMin) {
  if (value === null || value === undefined) {
    return '<span class="badge" style="background:#f3f4f6;color:#9ca3af;">—</span>';
  }
  let bg, fg;
  if (value >= greenMin) { bg = '#dcfce7'; fg = '#15803d'; }
  else if (value >= amberMin) { bg = '#fef3c7'; fg = '#92400e'; }
  else { bg = '#fee2e2'; fg = '#b91c1c'; }
  return `<span class="badge" style="background:${bg};color:${fg};">${value}%</span>`;
}

function tieredBadgeHtml(value) {
  if (value === null || value === undefined) {
    return '<span class="badge" style="background:#f3f4f6;color:#9ca3af;">—</span>';
  }
  return `<span class="badge" style="background:#f3f4f6;color:#6b7280;">T · ${value}%</span>`;
}

function dotHtml(safetyRate, qualityScore) {
  const safetyStatus = safetyRate == null ? 'gray' : safetyRate >= 95 ? 'green' : safetyRate >= 85 ? 'amber' : 'red';
  const qualityStatus = qualityScore == null ? 'gray' : qualityScore >= 80 ? 'green' : qualityScore >= 65 ? 'amber' : 'red';
  let color;
  if (safetyStatus === 'red' || qualityStatus === 'red') color = '#ef4444';
  else if (safetyStatus === 'amber' || qualityStatus === 'amber') color = '#f59e0b';
  else if (safetyStatus === 'gray' && qualityStatus === 'gray') color = '#d1d5db';
  else color = '#22c55e';
  return `<span class="dot" style="background:${color};"></span>`;
}

function alertStyle(condition) {
  return condition ? 'color:#dc2626;font-weight:600;' : 'color:#111827;';
}

// ─── Quality score badge (decides standard vs tiered) ─────────────────────────

function qualityBadge(row) {
  if (row.qualityInspType === 'tiered') return tieredBadgeHtml(row.qualityAvgScore);
  return scoreBadgeHtml(row.qualityAvgScore, 80, 65);
}

function qualityDotScore(row) {
  return row.qualityInspType === 'standard' ? row.qualityAvgScore : null;
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildHeader(filters) {
  const parts = [];
  if (filters.vp && filters.vp !== 'all') parts.push(`VP: ${filters.vp}`);
  if (filters.manager && filters.manager !== 'all') parts.push(`Manager: ${filters.manager}`);
  if (filters.job && filters.job !== 'all') parts.push(`Job: ${filters.job}`);
  const filterLine = parts.length > 0
    ? `<div class="filter-line">Filters: ${parts.join(' · ')}</div>`
    : '';
  return `
    <div class="header">
      <div class="title">Operations Workspace — Executive Summary</div>
      <div class="subtitle">${filters.startDate} to ${filters.endDate}</div>
      ${filterLine}
    </div>`;
}

function buildHeroCards(data) {
  const { workforceKpis: w, qualityKpis: q, financialKpis: f, safetyKpis: s } = data;

  function card(label, value, alert = false) {
    return `
      <div class="hero-card">
        <div class="hero-value" style="${alertStyle(alert)}">${value}</div>
        <div class="hero-label">${label}</div>
      </div>`;
  }

  return `
    <div class="hero-grid">
      ${card('Active Headcount', fmtNum(w?.activeHeadcount))}
      ${card('Turnover Rate', w?.hasTurnoverData ? fmtPct(w?.turnoverRate) : '—', w?.turnoverRate > 10)}
      ${card('Open Deficiencies', fmtNum(q?.openDeficiencies), q?.openDeficiencies > 0)}
      ${card('Open Claims', fmtNum(s?.openClaims), s?.openClaims > 0)}
      ${card('Total Payroll YTD', fmtCurrency(f?.totalPayroll))}
      ${card('Overtime %', w?.hasOvertimeData ? fmtPct(w?.overtimePct) : '—', w?.overtimePct > 15)}
      ${card('Avg Inspection Score', fmtPct(q?.avgScore), q?.avgScore != null && q?.avgScore < 80)}
      ${card('Inspections', fmtNum(q?.totalInspections))}
    </div>`;
}

function buildVpTable(rows) {
  if (!rows || rows.length === 0) return '';
  const header = `
    <tr>
      <th></th><th class="left">VP</th><th class="left">Jobs</th>
      <th class="right">Safety Insp.</th><th class="left">Safety Score</th>
      <th class="right">Quality Insp.</th><th class="left">Quality Score</th>
      <th class="right">Deficiencies</th><th class="right">Open Def.</th>
      <th class="left">Payroll</th><th class="right">Claims</th>
      <th class="left">Avg Close Days</th>
    </tr>`;

  const bodyRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
    const openDefStyle = r.openDeficiencies > 0 ? 'color:#dc2626;font-weight:600;' : '';
    const claimsStyle = r.claims > 0 ? 'color:#dc2626;font-weight:600;' : '';
    return `
      <tr style="background:${bg};">
        <td>${dotHtml(r.safetyPassRate, qualityDotScore(r))}</td>
        <td style="font-weight:500;">${r.vp}</td>
        <td>${r.jobCount}</td>
        <td class="right">${r.safetyInspCount || 0}</td>
        <td>${scoreBadgeHtml(r.safetyPassRate, 95, 85)}</td>
        <td class="right">${r.qualityInspCount || 0}</td>
        <td>${qualityBadge(r)}</td>
        <td class="right">${r.totalDeficiencies || 0}</td>
        <td class="right" style="${openDefStyle}">${r.openDeficiencies}</td>
        <td>${fmtCurrency(r.payroll)}</td>
        <td class="right" style="${claimsStyle}">${r.claims}</td>
        <td>${r.avgCloseDays ?? '—'}</td>
      </tr>`;
  }).join('');

  return `
    <div class="section">
      <div class="section-title">VP Performance Summary</div>
      <table><thead>${header}</thead><tbody>${bodyRows}</tbody></table>
    </div>`;
}

function buildManagerTable(rows) {
  if (!rows || rows.length === 0) return '';
  const headerRow = `
    <tr>
      <th></th><th class="left">Manager</th><th class="left">VP</th>
      <th class="left">Jobs</th><th class="right">Safety Insp.</th>
      <th class="left">Safety Score</th><th class="right">Quality Insp.</th>
      <th class="left">Quality Score</th><th class="right">Deficiencies</th>
      <th class="right">Open Def.</th><th class="left">Avg Close Days</th>
    </tr>`;

  const bodyRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
    const openDefStyle = r.openDeficiencies > 0 ? 'color:#dc2626;font-weight:600;' : '';
    return `
      <tr style="background:${bg};">
        <td>${dotHtml(r.safetyPassRate, qualityDotScore(r))}</td>
        <td style="font-weight:500;">${r.manager}</td>
        <td style="font-size:10px;color:#6b7280;">${r.vp}</td>
        <td>${r.jobCount}</td>
        <td class="right">${r.safetyInspCount || 0}</td>
        <td>${scoreBadgeHtml(r.safetyPassRate, 95, 85)}</td>
        <td class="right">${r.qualityInspCount || 0}</td>
        <td>${qualityBadge(r)}</td>
        <td class="right">${r.totalDeficiencies || 0}</td>
        <td class="right" style="${openDefStyle}">${r.openDeficiencies}</td>
        <td>${r.avgCloseDays ?? '—'}</td>
      </tr>`;
  }).join('');

  return `
    <div class="section">
      <div class="section-title">Manager Summary</div>
      <table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>
    </div>`;
}

function buildKpiDetail(data) {
  const { workforceKpis: w, qualityKpis: q, financialKpis: f, safetyKpis: s } = data;

  function kpiRow(label, value, alert = false, sub = null) {
    return `
      <div class="kpi-row">
        <span class="kpi-label">${label}</span>
        <span class="kpi-value" style="${alertStyle(alert)}">
          ${value}${sub ? `<span class="kpi-sub">${sub}</span>` : ''}
        </span>
      </div>`;
  }

  function cardWrap(title, headerBg, headerColor, content) {
    return `
      <div class="kpi-card">
        <div class="kpi-card-header" style="background:${headerBg};color:${headerColor};">${title}</div>
        <div class="kpi-card-body">${content}</div>
      </div>`;
  }

  // Workforce
  let workforceContent = '';
  if (w) {
    workforceContent += kpiRow('Active Headcount', fmtNum(w.activeHeadcount));
    workforceContent += kpiRow('Turnover Rate', w.hasTurnoverData ? fmtPct(w.turnoverRate) : '—', w.turnoverRate > 10, w.hasTurnoverData ? `${w.terminations} terminations` : 'No activity');
    workforceContent += kpiRow('Overtime %', w.hasOvertimeData ? fmtPct(w.overtimePct) : '—', w.overtimePct > 15, w.hasOvertimeData ? `of ${Number(w.totalHours).toLocaleString()} total hours` : 'No activity');
    workforceContent += kpiRow('Paid Time Off', w.hasAbsenceData ? fmtNum(w.ptoCount) : '—', false, `${fmtNum(w.ptoHours)} hrs`);
    workforceContent += kpiRow('Sick Days', w.hasAbsenceData ? fmtNum(w.sickCount) : '—', w.activeHeadcount > 0 && (w.sickCount / w.activeHeadcount) > 0.15, `${fmtNum(w.sickHours)} hrs`);
    workforceContent += kpiRow('Other Absences', w.hasAbsenceData ? fmtNum(w.otherAbsenceCount) : '—', w.otherAbsenceCount > 0, `${fmtNum(w.otherAbsenceHours)} hrs`);
  } else {
    workforceContent = '<div class="no-data">No data</div>';
  }

  // Quality
  let qualityContent = '';
  if (q) {
    qualityContent += kpiRow('Avg Inspection Score', fmtPct(q.avgScore), q.avgScore != null && q.avgScore < 80, 'Standard inspections only');
    qualityContent += kpiRow('Open Deficiencies', fmtNum(q.openDeficiencies), q.openDeficiencies > 0, `${fmtNum(q.totalDeficiencies)} total`);
    qualityContent += kpiRow('Sites Below Objective', fmtNum(q.sitesBelowObjective), q.sitesBelowObjective > 0, `of ${q.totalSitesInspected} inspected`);
  } else {
    qualityContent = '<div class="no-data">No data</div>';
  }

  // Payroll
  let payrollContent = '';
  if (f && f.hasPayrollData) {
    payrollContent += kpiRow('Total Payroll', fmtCurrency(f.totalPayroll));
    payrollContent += kpiRow('Regular Pay', fmtCurrency(f.regularPay));
    payrollContent += kpiRow('Overtime Pay', fmtCurrency(f.otPay));
    payrollContent += kpiRow('Total Hours', fmtNum(f.totalHours));
    payrollContent += kpiRow('Overtime %', fmtPct(f.otPct), f.otPct > 15);
    if (f.hasBudgetData) {
      payrollContent += '<div style="border-top:1px solid #e5e7eb;margin:6px 0;"></div>';
      payrollContent += kpiRow('Budget Labor', fmtCurrency(f.budgetLaborDollars));
      payrollContent += kpiRow('Budget Hours', fmtNum(f.budgetHours));
      payrollContent += kpiRow('Variance', fmtPct(f.laborVariancePct), f.laborVariancePct > 0, f.laborVariancePct > 0 ? 'Over budget' : 'Under budget');
    }
  } else {
    payrollContent = '<div class="no-data">No payroll data</div>';
  }

  // Safety
  let safetyContent = '';
  if (s && s.hasData) {
    safetyContent += kpiRow('Open Claims', fmtNum(s.openClaims), s.openClaims > 0);
    safetyContent += kpiRow('Out of Work', fmtNum(s.outOfWork), s.outOfWork > 0);
    safetyContent += kpiRow('Total Incurred', fmtCurrency(s.totalIncurred));
    safetyContent += kpiRow('Recordable Incidents', fmtNum(s.recordableIncidents), false, `${s.totalClaims} total claims`);
    safetyContent += kpiRow('Lost Time Incidents', fmtNum(s.lostTimeIncidents), s.lostTimeIncidents > 0);
  } else {
    safetyContent = '<div class="no-data">No claims data</div>';
  }

  return `
    <div class="kpi-detail-section">
      <div class="section-title">KPI Detail</div>
      <div class="kpi-grid">
        ${cardWrap('Workforce & Labor', '#eff6ff', '#1d4ed8', workforceContent)}
        ${cardWrap('Quality', '#f0fdf4', '#15803d', qualityContent)}
        ${cardWrap('Payroll Actuals', '#faf5ff', '#7e22ce', payrollContent)}
        ${cardWrap('Safety & Compliance', '#fef2f2', '#b91c1c', safetyContent)}
      </div>
    </div>`;
}

function buildFooter() {
  const ts = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  return `<div class="footer">Generated ${ts}</div>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #111827; line-height: 1.4; padding: 0.4in 0.5in;
  }
  @page { size: letter landscape; margin: 0.4in 0.5in; }
  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .header { margin-bottom: 18px; }
  .title { font-size: 18px; font-weight: 700; }
  .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .filter-line { font-size: 11px; color: #6b7280; margin-top: 4px; }

  .hero-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .hero-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 10px; text-align: center; background: #fff; }
  .hero-value { font-size: 20px; font-weight: 700; }
  .hero-label { font-size: 10px; color: #6b7280; margin-top: 3px; }

  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 8px; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { padding: 6px 10px; font-size: 10px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb; white-space: nowrap; text-align: left; }
  td { padding: 5px 10px; font-size: 11px; color: #374151; border-bottom: 1px solid #f3f4f6; }
  th.right, td.right { text-align: right; }
  th.left, td.left { text-align: left; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }

  .kpi-detail-section { page-break-before: always; margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; break-inside: avoid; }
  .kpi-card-header { padding: 8px 12px; font-size: 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
  .kpi-card-body { padding: 10px 12px; }

  .kpi-row { display: flex; justify-content: space-between; align-items: baseline; padding: 3px 0; }
  .kpi-label { font-size: 11px; color: #6b7280; }
  .kpi-value { font-size: 12px; font-weight: 600; text-align: right; }
  .kpi-sub { display: block; font-size: 10px; color: #9ca3af; font-weight: 400; }
  .no-data { font-size: 11px; color: #9ca3af; }

  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: right; }
`;

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateOpsWorkspacePdf(data) {
  const { filters, vpSummary, managerSummary } = data;

  const body = `
    ${buildHeader(filters)}
    ${buildHeroCards(data)}
    ${buildVpTable(vpSummary)}
    ${buildManagerTable(managerSummary)}
    ${buildKpiDetail(data)}
    ${buildFooter()}`;

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Ops Executive Summary — ${filters.startDate} to ${filters.endDate}</title>
  <style>${CSS}</style>
</head><body>${body}</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups for this site to print the report.');
    return;
  }
  w.document.write(html);
  w.document.close();
  // Wait for fonts/layout to settle, then trigger print
  w.onload = () => { w.print(); };
}
