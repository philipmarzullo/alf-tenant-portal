import { SHARED_RULES } from '../prompts';

function buildVPReportPrompt(data) {
  const { autoData, vpInputs, vp, startDate, endDate } = data;

  // Build auto-populated data section
  const autoLines = [];
  autoLines.push(`VP: ${vp}`);
  autoLines.push(`Period: ${startDate} to ${endDate}`);

  if (autoData.workforce) {
    const w = autoData.workforce;
    autoLines.push(`\n--- WORKFORCE & LABOR ---`);
    autoLines.push(`Active Headcount: ${w.activeHeadcount ?? '—'}`);
    if (w.hasTurnoverData) {
      autoLines.push(`Turnover Rate: ${w.turnoverRate}% (${w.terminations} terminations)`);
    }
    if (w.hasOvertimeData) {
      autoLines.push(`Overtime: ${w.overtimePct}% of ${Number(w.totalHours).toLocaleString()} total hours`);
    }
    if (w.hasAbsenceData) {
      autoLines.push(`PTO: ${w.ptoCount} occurrences (${w.ptoHours} hrs)`);
      autoLines.push(`Sick Days: ${w.sickCount} occurrences (${w.sickHours} hrs)`);
      autoLines.push(`Other Absences: ${w.otherAbsenceCount} occurrences (${w.otherAbsenceHours} hrs)`);
    }
  }

  if (autoData.quality) {
    const q = autoData.quality;
    autoLines.push(`\n--- QUALITY ---`);
    autoLines.push(`Avg Inspection Score: ${q.avgScore ?? '—'}%`);
    autoLines.push(`Open Deficiencies: ${q.openDeficiencies} of ${q.totalDeficiencies} total`);
    autoLines.push(`Sites Below Objective: ${q.sitesBelowObjective} of ${q.totalSitesInspected} inspected`);
  }

  if (autoData.vpRow) {
    const r = autoData.vpRow;
    autoLines.push(`\n--- VP-LEVEL METRICS ---`);
    autoLines.push(`Jobs: ${r.jobCount}`);
    autoLines.push(`Safety Inspections: ${r.safetyInspCount}, Pass Rate: ${r.safetyPassRate ?? '—'}%`);
    autoLines.push(`Quality Inspections: ${r.standardInspCount}, Avg Score: ${r.standardAvgScore ?? '—'}%`);
    autoLines.push(`Avg Deficiency Close Days: ${r.avgCloseDays ?? '—'}`);
  }

  if (autoData.financial) {
    const f = autoData.financial;
    autoLines.push(`\n--- FINANCIAL ---`);
    if (f.hasPayrollData) {
      autoLines.push(`Total Payroll: $${Number(f.totalPayroll).toLocaleString()}`);
      autoLines.push(`Overtime Pay: $${Number(f.otPay).toLocaleString()}`);
      if (f.hasBudgetData) {
        autoLines.push(`Budget Labor: $${Number(f.budgetLaborDollars).toLocaleString()}`);
        autoLines.push(`Labor Variance: ${f.laborVariancePct}%`);
        if (f.oldestBudgetUpdate && f.budgetLastUpdated) {
          autoLines.push(`Budget Range: ${f.oldestBudgetUpdate} to ${f.budgetLastUpdated}`);
        }
      }
    }
  }

  if (autoData.safety) {
    const s = autoData.safety;
    autoLines.push(`\n--- SAFETY ---`);
    if (s.hasData) {
      autoLines.push(`Open Claims: ${s.openClaims}`);
      autoLines.push(`Out of Work: ${s.outOfWork}`);
      autoLines.push(`Total Incurred: $${Number(s.totalIncurred).toLocaleString()}`);
      autoLines.push(`Recordable Incidents: ${s.recordableIncidents}`);
      autoLines.push(`Lost Time Incidents: ${s.lostTimeIncidents}`);
    }
  }

  if (autoData.topDeficiencyAreas?.length) {
    autoLines.push(`\n--- TOP DEFICIENCY AREAS ---`);
    autoData.topDeficiencyAreas.forEach((a, i) => {
      autoLines.push(`${i + 1}. ${a.area}: ${a.deficiency_rate ?? a.deficiencyRate ?? a.rate}%`);
    });
  }

  // Build VP narrative inputs section
  const inputLines = [];
  const inp = vpInputs;

  inputLines.push(`\n=== VP NARRATIVE INPUTS ===`);

  // Executive Summary
  inputLines.push(`\n--- EXECUTIVE SUMMARY ---`);
  inputLines.push(`Overall Status: ${inp.status || 'Not provided'}`);
  if (inp.keyChanges?.some(Boolean)) {
    inputLines.push(`Key Changes:`);
    inp.keyChanges.filter(Boolean).forEach(c => inputLines.push(`  - ${c}`));
  }
  if (inp.vpTakeaway) inputLines.push(`VP Takeaway: ${inp.vpTakeaway}`);

  // Strategic Initiatives
  if (inp.initiatives?.some(i => i.name)) {
    inputLines.push(`\n--- STRATEGIC INITIATIVES ---`);
    inp.initiatives.filter(i => i.name).forEach(i => {
      inputLines.push(`  - ${i.name} | Status: ${i.status || 'N/A'} | Impact: ${i.impact || 'N/A'}`);
    });
  }

  // Client Health
  inputLines.push(`\n--- CLIENT HEALTH ---`);
  if (inp.escalations) inputLines.push(`Escalations: ${inp.escalations}`);
  if (inp.contractsAtRisk) inputLines.push(`Contracts at Risk: ${inp.contractsAtRisk}`);
  if (inp.contractsForRenewal) inputLines.push(`Contracts for Renewal: ${inp.contractsForRenewal}`);

  // Safety Notes
  if (inp.highRiskContext || inp.trainingActivities) {
    inputLines.push(`\n--- SAFETY NOTES ---`);
    if (inp.highRiskContext) inputLines.push(`High-Risk Site Context: ${inp.highRiskContext}`);
    if (inp.trainingActivities) inputLines.push(`Training Activities: ${inp.trainingActivities}`);
  }

  // Next Quarter Priorities
  inputLines.push(`\n--- NEXT QUARTER PRIORITIES ---`);
  if (inp.priority1) inputLines.push(`Priority 1: ${inp.priority1}`);
  if (inp.priority2) inputLines.push(`Priority 2: ${inp.priority2}`);
  if (inp.priority3) inputLines.push(`Priority 3: ${inp.priority3}`);
  if (inp.decisionsNeeded) inputLines.push(`Decisions Needed: ${inp.decisionsNeeded}`);
  if (inp.keyRisks) inputLines.push(`Key Risks: ${inp.keyRisks}`);

  // Additional Notes
  if (inp.additionalNotes) {
    inputLines.push(`\n--- ADDITIONAL NOTES ---`);
    inputLines.push(inp.additionalNotes);
  }

  return `Generate a VP Quarterly Performance Report using the following data.

=== AUTO-POPULATED OPERATIONAL DATA ===
${autoLines.join('\n')}

${inputLines.join('\n')}

Generate the full report now. Use the structure defined in your system prompt.`;
}

export const vpReportAgent = {
  name: 'VP Report Generator',
  department: 'ops',
  status: 'active',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192,
  systemPrompt: `You are a VP Quarterly Performance Report generator for a facility services company. You produce polished, executive-ready reports combining auto-populated operational data with VP narrative inputs.

${SHARED_RULES}

## REPORT STRUCTURE

Generate the report using these sections with markdown headers (## Section Name). Every section is required — if data is missing for a section, state "No data provided" rather than omitting it.

## Executive Summary
- Open with the VP's overall status (On Track / At Risk / Off Track) as a bold callout
- Summarize the quarter in 3-4 sentences: what went well, what needs attention, and the VP's own takeaway
- Incorporate the key changes the VP provided

## Operational Performance
- Present workforce, quality, financial, and safety KPIs in a structured format
- Use the auto-populated data — do NOT fabricate numbers
- Call out metrics that are above/below targets:
  - Turnover > 10% = flag
  - Overtime > 15% = flag
  - Inspection score < 80% = flag
  - Open deficiencies > 0 = flag
  - Recordable incidents > 0 = flag
- Include the top deficiency areas with percentages

## Strategic Initiatives
- Present each initiative with its status and expected impact
- If no initiatives were provided, note "No strategic initiatives reported this quarter"

## Client Health
- Summarize escalations, at-risk contracts, and renewals
- Frame risks constructively with recommended actions

## Safety & Risk Management
- Combine auto safety data (claims, incidents, incurred costs) with VP's safety notes
- Include high-risk site context and training activities
- If safety data shows zero incidents, highlight this positively

## Financial Overview
- Present payroll, OT, and budget variance data
- Note whether spending is within budget or over
- Include budget date range for context

## Next Quarter Outlook
- Present the VP's top 3 priorities
- Include decisions needed and key risks
- Frame as forward-looking action items

## Additional Notes
- Include any additional context the VP provided
- If none, omit this section entirely (this is the ONE section you may omit)

## FORMATTING RULES
- Use ## for section headers (exactly as listed above)
- Use **bold** for KPI labels and status badges
- Use bullet points for lists
- Present KPIs as "**Label:** Value" format
- Keep paragraphs to 2-3 sentences max
- Use numbers and percentages from the data — never round or approximate
- Status badges: "On Track", "At Risk", "Off Track" — always bold
- Do not include a title/header — the component adds the cover block separately`,

  actions: {
    generateReport: {
      label: 'Generate VP Report',
      description: 'Generate a quarterly performance report for a VP',
      promptTemplate: (data) => buildVPReportPrompt(data),
    },
    regenerateReport: {
      label: 'Regenerate VP Report',
      description: 'Regenerate the VP report with updated inputs',
      promptTemplate: (data) => buildVPReportPrompt(data),
    },
  },
};
