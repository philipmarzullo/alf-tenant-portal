// src/utils/opsWorkspacePdf.js
// One-click PDF export for Ops Workspace Executive Summary.
// Uses html2pdf.js (dynamically imported, ~200KB code-split).

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
    return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#f3f4f6;color:#9ca3af;">—</span>`;
  }
  let bg, fg;
  if (value >= greenMin) { bg = '#dcfce7'; fg = '#15803d'; }
  else if (value >= amberMin) { bg = '#fef3c7'; fg = '#92400e'; }
  else { bg = '#fee2e2'; fg = '#b91c1c'; }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${bg};color:${fg};">${value}%</span>`;
}

function tieredBadgeHtml(value) {
  if (value === null || value === undefined) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#f3f4f6;color:#9ca3af;">—</span>`;
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:#f3f4f6;color:#6b7280;">T · ${value}%</span>`;
}

function dotHtml(safetyRate, qualityScore) {
  const safetyStatus = safetyRate == null ? 'gray' : safetyRate >= 95 ? 'green' : safetyRate >= 85 ? 'amber' : 'red';
  const qualityStatus = qualityScore == null ? 'gray' : qualityScore >= 80 ? 'green' : qualityScore >= 65 ? 'amber' : 'red';
  let color;
  if (safetyStatus === 'red' || qualityStatus === 'red') color = '#ef4444';
  else if (safetyStatus === 'amber' || qualityStatus === 'amber') color = '#f59e0b';
  else if (safetyStatus === 'gray' && qualityStatus === 'gray') color = '#d1d5db';
  else color = '#22c55e';
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>`;
}

function alertStyle(condition) {
  return condition ? 'color:#dc2626;font-weight:600;' : 'color:#111827;';
}

// ─── Shared table styles ──────────────────────────────────────────────────────

const thStyle = 'padding:6px 10px;font-size:10px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;white-space:nowrap;';
const tdStyle = 'padding:5px 10px;font-size:11px;color:#374151;border-bottom:1px solid #f3f4f6;';

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
    ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">Filters: ${parts.join(' · ')}</div>`
    : '';
  return `
    <div style="margin-bottom:18px;">
      <div style="font-size:18px;font-weight:700;color:#111827;">Operations Workspace — Executive Summary</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px;">${filters.startDate} to ${filters.endDate}</div>
      ${filterLine}
    </div>`;
}

function buildHeroCards(data) {
  const { workforceKpis: w, qualityKpis: q, financialKpis: f, safetyKpis: s } = data;

  function card(label, value, alert = false) {
    return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 10px;text-align:center;background:#fff;">
        <div style="font-size:20px;font-weight:700;${alertStyle(alert)}">${value}</div>
        <div style="font-size:10px;color:#6b7280;margin-top:3px;">${label}</div>
      </div>`;
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
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
      <th style="${thStyle}"></th>
      <th style="${thStyle}text-align:left;">VP</th>
      <th style="${thStyle}text-align:left;">Jobs</th>
      <th style="${thStyle}text-align:right;">Safety Insp.</th>
      <th style="${thStyle}text-align:left;">Safety Score</th>
      <th style="${thStyle}text-align:right;">Quality Insp.</th>
      <th style="${thStyle}text-align:left;">Quality Score</th>
      <th style="${thStyle}text-align:right;">Deficiencies</th>
      <th style="${thStyle}text-align:right;">Open Def.</th>
      <th style="${thStyle}text-align:left;">Payroll</th>
      <th style="${thStyle}text-align:right;">Claims</th>
      <th style="${thStyle}text-align:left;">Avg Close Days</th>
    </tr>`;

  const bodyRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f9fafb';
    const dot = dotHtml(r.safetyPassRate, qualityDotScore(r));
    const safetyBadge = scoreBadgeHtml(r.safetyPassRate, 95, 85);
    const qBadge = qualityBadge(r);
    const openDefStyle = r.openDeficiencies > 0 ? 'color:#dc2626;font-weight:600;' : '';
    const claimsStyle = r.claims > 0 ? 'color:#dc2626;font-weight:600;' : '';
    return `
      <tr class="avoid-break" style="background:${bg};">
        <td style="${tdStyle}">${dot}</td>
        <td style="${tdStyle}font-weight:500;">${r.vp}</td>
        <td style="${tdStyle}">${r.jobCount}</td>
        <td style="${tdStyle}text-align:right;">${r.safetyInspCount || 0}</td>
        <td style="${tdStyle}">${safetyBadge}</td>
        <td style="${tdStyle}text-align:right;">${r.qualityInspCount || 0}</td>
        <td style="${tdStyle}">${qBadge}</td>
        <td style="${tdStyle}text-align:right;">${r.totalDeficiencies || 0}</td>
        <td style="${tdStyle}text-align:right;${openDefStyle}">${r.openDeficiencies}</td>
        <td style="${tdStyle}">${fmtCurrency(r.payroll)}</td>
        <td style="${tdStyle}text-align:right;${claimsStyle}">${r.claims}</td>
        <td style="${tdStyle}">${r.avgCloseDays ?? '—'}</td>
      </tr>`;
  }).join('');

  return `
    <div style="margin-bottom:20px;" class="avoid-break">
      <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px;">VP Performance Summary</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>${header}</thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

function buildManagerTable(rows) {
  if (!rows || rows.length === 0) return '';

  const headerRow = `
    <tr>
      <th style="${thStyle}"></th>
      <th style="${thStyle}text-align:left;">Manager</th>
      <th style="${thStyle}text-align:left;">VP</th>
      <th style="${thStyle}text-align:left;">Jobs</th>
      <th style="${thStyle}text-align:right;">Safety Insp.</th>
      <th style="${thStyle}text-align:left;">Safety Score</th>
      <th style="${thStyle}text-align:right;">Quality Insp.</th>
      <th style="${thStyle}text-align:left;">Quality Score</th>
      <th style="${thStyle}text-align:right;">Deficiencies</th>
      <th style="${thStyle}text-align:right;">Open Def.</th>
      <th style="${thStyle}text-align:left;">Avg Close Days</th>
    </tr>`;

  // Split into chunks of 25 rows for pagination
  const CHUNK = 25;
  const chunks = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    chunks.push(rows.slice(i, i + CHUNK));
  }

  return chunks.map((chunk, ci) => {
    const bodyRows = chunk.map((r, i) => {
      const globalIdx = ci * CHUNK + i;
      const bg = globalIdx % 2 === 0 ? '#fff' : '#f9fafb';
      const dot = dotHtml(r.safetyPassRate, qualityDotScore(r));
      const safetyBadge = scoreBadgeHtml(r.safetyPassRate, 95, 85);
      const qBadge = qualityBadge(r);
      const openDefStyle = r.openDeficiencies > 0 ? 'color:#dc2626;font-weight:600;' : '';
      return `
        <tr class="avoid-break" style="background:${bg};">
          <td style="${tdStyle}">${dot}</td>
          <td style="${tdStyle}font-weight:500;">${r.manager}</td>
          <td style="${tdStyle}font-size:10px;color:#6b7280;">${r.vp}</td>
          <td style="${tdStyle}">${r.jobCount}</td>
          <td style="${tdStyle}text-align:right;">${r.safetyInspCount || 0}</td>
          <td style="${tdStyle}">${safetyBadge}</td>
          <td style="${tdStyle}text-align:right;">${r.qualityInspCount || 0}</td>
          <td style="${tdStyle}">${qBadge}</td>
          <td style="${tdStyle}text-align:right;">${r.totalDeficiencies || 0}</td>
          <td style="${tdStyle}text-align:right;${openDefStyle}">${r.openDeficiencies}</td>
          <td style="${tdStyle}">${r.avgCloseDays ?? '—'}</td>
        </tr>`;
    }).join('');

    const pageBreak = ci > 0 ? 'page-break-before:always;' : '';
    return `
      <div style="${pageBreak}margin-bottom:20px;">
        ${ci === 0 ? '<div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px;">Manager Summary</div>' : '<div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Manager Summary (continued)</div>'}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>${headerRow}</thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  }).join('');
}

function buildKpiDetail(data) {
  const { workforceKpis: w, qualityKpis: q, financialKpis: f, safetyKpis: s } = data;

  function kpiRow(label, value, alert = false, sub = null) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;">
        <span style="font-size:11px;color:#6b7280;">${label}</span>
        <div style="text-align:right;">
          <span style="font-size:12px;font-weight:600;${alertStyle(alert)}">${value}</span>
          ${sub ? `<div style="font-size:10px;color:#9ca3af;">${sub}</div>` : ''}
        </div>
      </div>`;
  }

  function cardWrap(title, headerBg, headerColor, content) {
    return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;" class="avoid-break">
        <div style="padding:8px 12px;background:${headerBg};color:${headerColor};font-size:12px;font-weight:600;border-bottom:1px solid #e5e7eb;">
          ${title}
        </div>
        <div style="padding:10px 12px;">${content}</div>
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
    workforceContent = '<div style="font-size:11px;color:#9ca3af;">No data</div>';
  }

  // Quality
  let qualityContent = '';
  if (q) {
    qualityContent += kpiRow('Avg Inspection Score', fmtPct(q.avgScore), q.avgScore != null && q.avgScore < 80, 'Standard inspections only');
    qualityContent += kpiRow('Open Deficiencies', fmtNum(q.openDeficiencies), q.openDeficiencies > 0, `${fmtNum(q.totalDeficiencies)} total`);
    qualityContent += kpiRow('Sites Below Objective', fmtNum(q.sitesBelowObjective), q.sitesBelowObjective > 0, `of ${q.totalSitesInspected} inspected`);
  } else {
    qualityContent = '<div style="font-size:11px;color:#9ca3af;">No data</div>';
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
    payrollContent = '<div style="font-size:11px;color:#9ca3af;">No payroll data</div>';
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
    safetyContent = '<div style="font-size:11px;color:#9ca3af;">No claims data</div>';
  }

  return `
    <div style="page-break-before:always;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px;">KPI Detail</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
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
  return `<div style="margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:right;">Generated ${ts}</div>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateOpsWorkspacePdf(data) {
  const { default: html2pdf } = await import('html2pdf.js');

  const { filters, vpSummary, managerSummary } = data;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;line-height:1.4;">
      ${buildHeader(filters)}
      ${buildHeroCards(data)}
      ${buildVpTable(vpSummary)}
      ${buildManagerTable(managerSummary)}
      ${buildKpiDetail(data)}
      ${buildFooter()}
    </div>`;

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;width:10in;';
  container.innerHTML = html;
  document.body.appendChild(container);

  const dateSlug = `${filters.startDate}_${filters.endDate}`.replace(/\//g, '-');

  try {
    await html2pdf().set({
      margin: [0.4, 0.5, 0.4, 0.5],
      filename: `ops-executive-summary-${dateSlug}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.avoid-break'] },
    }).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}
