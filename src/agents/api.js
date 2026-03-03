import { getAgent, getAgentAction } from './registry';
import { getFreshToken } from '../lib/supabase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

// Module-level tenant context — set once by BrandingProvider, used as
// default fallback so no call site needs to pass tenantContext explicitly.
let _tenantContext = null;
export function setTenantContext(ctx) { _tenantContext = ctx; }

// Module-level tenant ID — set by UserProvider when profile loads.
// Falls back to env var for standalone deploys.
let _tenantId = import.meta.env.VITE_TENANT_ID || null;
export function setApiTenantId(id) { _tenantId = id; }

/**
 * Resolve the tenant_id for API calls.
 * Uses the module-level _tenantId set by UserProvider (or env var fallback).
 */
export function getTenantId() {
  return _tenantId;
}

/**
 * Call the Claude API through the backend proxy with an agent configuration.
 *
 * @param {string} agentKey - Key from the registry (e.g., 'hr', 'finance')
 * @param {string} actionKey - Action within the agent (e.g., 'draftReminder')
 * @param {object} data - Data to populate the prompt template
 * @param {object} [tenantContext] - Optional { companyName } for prompt parameterization
 * @returns {Promise<string>} - The assistant's response text
 */
export async function callAgent(agentKey, actionKey, data, tenantContext) {
  const ctx = tenantContext || _tenantContext;
  const agent = getAgent(agentKey, ctx);
  const action = getAgentAction(agentKey, actionKey, ctx);

  if (!agent || !action) {
    throw new Error(`Agent or action not found: ${agentKey}/${actionKey}`);
  }

  const userMessage = action.promptTemplate(data);
  const token = await getFreshToken();

  // No session or no backend — fall back to mock responses
  if (!token) {
    return getMockResponse(agentKey, actionKey, data, ctx);
  }

  const tenantId = getTenantId();

  const response = await fetch(`${BACKEND_URL}/api/claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: agent.model,
      max_tokens: agent.maxTokens || 4096,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      agent_key: agentKey,
      tenant_id: tenantId,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error || `API error: ${response.status}`);
    error.status = response.status;
    if (err.limit != null) error.limit = err.limit;
    if (err.used != null) error.used = err.used;
    if (err.resets_at) error.resets_at = err.resets_at;
    throw error;
  }

  const result = await response.json();
  return result.content?.[0]?.text || 'No response generated.';
}

/**
 * Chat with an agent (multi-turn) through the backend proxy.
 *
 * @param {string} agentKey
 * @param {Array} messages
 * @param {object} [tenantContext]
 * @param {{ systemPromptSuffix?: string }} [options]
 */
export async function chatWithAgent(agentKey, messages, tenantContext, options = {}) {
  const ctx = tenantContext || _tenantContext;
  const agent = getAgent(agentKey, ctx); // may be null — backend resolves from DB

  const token = await getFreshToken();

  if (!token) {
    return 'Live AI responses require an active session and backend connection. For now, this is a demo of the chat interface — the agent would respond with context-aware answers based on loaded SOPs and company knowledge.';
  }

  const tenantId = getTenantId();

  // Build request body — if local agent found, include system prompt; otherwise backend resolves from DB
  const body = { messages, agent_key: agentKey, tenant_id: tenantId, max_tokens: 2048 };

  if (agent) {
    const systemPrompt = options.systemPromptSuffix
      ? `${agent.systemPrompt}\n\n${options.systemPromptSuffix}`
      : agent.systemPrompt;
    body.system = systemPrompt;
    body.model = agent.model;
  } else if (options.systemPromptSuffix) {
    // No local agent — send suffix as page_context for backend to append
    body.page_context = options.systemPromptSuffix;
  }

  const response = await fetch(`${BACKEND_URL}/api/claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error || `API error: ${response.status}`);
    error.status = response.status;
    if (err.limit != null) error.limit = err.limit;
    if (err.used != null) error.used = err.used;
    if (err.resets_at) error.resets_at = err.resets_at;
    throw error;
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || 'No response generated.';

  // If caller wants execution context (skill modes), return an object
  if (options.includeExecutionContext && result.execution_context) {
    return { text, execution_context: result.execution_context };
  }

  return text;
}

function getMockResponse(agentKey, actionKey, data, tenantContext) {
  // Realistic mock responses for demo without API key
  const co = tenantContext?.companyName || 'the company';
  const coTeam = tenantContext?.companyName ? `${tenantContext.companyName} Team` : 'the team';
  const mocks = {
    hr: {
      draftReminder: `Subject: Action Needed — Complete Your Benefits Enrollment

Hi ${data.employeeName || 'there'},

Welcome to ${co}! As part of your onboarding, you're eligible to enroll in our benefits program.

You have ${data.daysRemaining || 'several'} days remaining to complete your enrollment through Employee Navigator. Here's what you need to do:

1. Log in to Employee Navigator (check your email for the invitation link)
2. Review available plan options (Medical, Dental, Vision)
3. Select your coverage level and add any dependents
4. Submit your elections before the deadline

If you have questions about plan options or need help navigating the portal, please reach out to HR — we're here to help.

Best regards,
${coTeam}`,
      generateSystemUpdate: `HR System Update Instructions — ${data.employeeName || 'Employee'}

1. Open the HR system → Employee Master File
2. Search for employee: ${data.employeeName || '[Employee Name]'}
3. Navigate to: ${data.description?.includes('leave') ? 'Status tab → Employment Status' : 'Compensation tab → Pay Rate'}
4. Update the following fields:
   ${data.description || '- [Specific field updates based on action type]'}
5. Set effective date: ${data.effectiveDate || '[Date]'}
6. Save and verify changes
7. Run payroll preview to confirm calculations

Note: Changes must be entered before the next payroll processing cutoff.`,
      checkUnionCompliance: `Union Compliance Check — ${data.employeeName || 'Employee'}

Union: ${data.union || 'N/A'}
Current Rate: ${data.currentRate || 'N/A'}
Proposed Rate: ${data.proposedRate || 'N/A'}

✓ COMPLIANT — The proposed rate matches the contract schedule for this classification.

Verified against:
- Article 12, Section 3 — Wage Schedule effective Jan 1, 2026
- The increase aligns with the negotiated annual adjustment
- No additional step increases are due at this time

Next Steps:
1. Proceed with VP approval
2. Enter in the HR system with effective date
3. Confirm on next payroll preview`,
      notifyOperations: `Operations Notification — Leave of Absence

Employee: ${data.employeeName || 'Employee'}
Leave Type: ${data.type || 'N/A'}
Dates: ${data.dates || 'N/A'}

To: Site Supervisor / VP Operations

${data.employeeName || 'Employee'} has been approved for ${data.type || 'leave'}. Please arrange coverage for their assigned duties during the absence period (${data.dates || 'dates pending'}).

Staffing Implications:
- Review shift schedule and assign temporary coverage
- Brief replacement staff on site-specific responsibilities
- Update daily headcount reporting

Return-to-Work:
- Employee will need return-to-work clearance before resuming duties
- Schedule a check-in for the first day back
- HR will provide updated fitness-for-duty documentation if applicable

Questions? Contact HR at ext. 2100.`,
      checkEligibility: `Eligibility Assessment — ${data.employeeName || 'Employee'}

Leave Type: ${data.type || 'N/A'}

FMLA Eligibility:
✓ Employed 12+ months
✓ 1,250+ hours worked in preceding 12 months
✓ Worksite has 50+ employees within 75 miles

State Leave (NY PFL):
✓ Eligible — meets 26-week employment threshold

Required Documentation:
1. Medical certification (WH-380-E) — Due within 15 days of request
2. Designation notice (WH-382) — HR to provide within 5 business days
3. Employee rights notice — Already provided at hire

Recommendation: Approve and issue designation notice. Set 15-day deadline for medical certification.`,
      sendReminder: `Subject: Friendly Reminder — Documentation Needed

Hi ${data.employeeName || 'there'},

I hope you're doing well. I'm reaching out as a reminder that we still need the following documentation for your ${data.type || 'leave'} request:

- [Outstanding document per case file]

We understand life gets busy, and we're here to help if you have any questions or need assistance obtaining these documents. Please submit them at your earliest convenience to ensure continued coverage.

You can submit documents via:
- Email: hr@yourcompany.com
- E-Hub upload portal
- In person to the HR office

If you're experiencing any difficulty, please don't hesitate to reach out — we're happy to help.

Best regards,
${coTeam}`,
      runEnrollmentAudit: `Benefits Enrollment Audit Summary

Reviewed: ${data.count || 'N/A'} open enrollments

⚠️ Action Needed:
- 2 employees approaching enrollment deadline (<10 days remaining)
- 1 employee has not logged into Employee Navigator yet

✓ On Track:
- 3 enrollments progressing normally
- All broker assignments confirmed

Recommendations:
1. Send immediate reminder to employees with <10 days remaining
2. Follow up with employee who hasn't accessed portal — may need IT assistance
3. Schedule check-in with broker for upcoming deadline cases

Next audit recommended: 1 week`,
    },
    finance: {
      draftCollectionEmail: `Subject: Account Review — ${data.client || 'Client'}

Dear ${data.client || 'Client'} Accounts Payable Team,

I hope this finds you well. I'm reaching out regarding your account with ${co}.

Our records show a current outstanding balance of ${data.total || '$XX,XXX'}. Here's a summary:
- Current (1-30 days): ${data.bucket30 || '$XX,XXX'}
- 31-60 days: ${data.bucket60 || '$XX,XXX'}
- 61-90 days: ${data.bucket90 || '$XX,XXX'}

We value our partnership and want to ensure there are no issues with the invoices. If there are any discrepancies or if you need copies of any invoices, please don't hesitate to reach out.

Could you provide an update on the expected payment schedule? We're happy to work with your team on any billing questions.

Best regards,
${coTeam}`,
      summarizeAccount: `Account Summary — ${data.client || 'Client'}

Total Outstanding: ${data.total || '$0'}
Last Payment: ${data.lastPayment || 'N/A'}

Aging Profile:
- Current (1-30): ${data.bucket30 || '$0'}
- 31-60 days: ${data.bucket60 || '$0'}
- 61-90 days: ${data.bucket90 || '$0'}
- 91+ days: ${data.bucket91 || '$0'}

Risk Assessment: ${data.bucket91 && data.bucket91 !== '$0' ? 'ELEVATED — Significant balance in 91+ bucket' : 'MODERATE — Aging within normal range'}

Payment Pattern: Client historically pays within 45-60 days. Recent slowdown may indicate internal AP processing changes.

Recommended Actions:
1. Schedule a courtesy call with client AP department
2. Verify all invoices have been received and are undisputed
3. Request expected payment timeline
4. Consider escalation if no response within 10 business days`,
    },
    ops: {
      vpPerformanceSummary: `VP PERFORMANCE SUMMARY — ${data.vp || '[VP Name]'}

Portfolio: ${data.jobCount || 'N/A'} jobs under management

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSPECTION COMPLIANCE
• Safety Inspection Rate: ${data.revenueInspectedSafety || 'N/A'}% ${data.revenueInspectedSafety && data.revenueInspectedSafety < 90 ? '⚠ BELOW 90% TARGET' : '✓ Meets target'}
• Commercial Inspection Rate: ${data.revenueInspectedCommercial || 'N/A'}% ${data.revenueInspectedCommercial && data.revenueInspectedCommercial < 90 ? '⚠ BELOW 90% TARGET' : '✓ Meets target'}
• Safety Inspections Completed: ${data.safetyInspections || 'N/A'}
• Commercial Inspections Completed: ${data.commercialInspections || 'N/A'}

DEFICIENCY MANAGEMENT
• Sites with Deficiencies: ${data.sitesWithDeficiencies || 'N/A'}
• Avg Close Days: ${data.avgDeficiencyClosedDays || 'N/A'}d ${data.avgDeficiencyClosedDays && data.avgDeficiencyClosedDays > 2 ? '⚠ ABOVE 2-DAY TARGET' : '✓ Within target'}
• Deficiency rate: ${data.sitesWithDeficiencies && data.jobCount ? Math.round((data.sitesWithDeficiencies / data.jobCount) * 100) + '% of managed sites' : 'N/A'}

INCIDENT & RECOGNITION
• Incidents: ${data.incidents || 0} ${data.incidents > 2 ? '⚠ ELEVATED — review required' : '✓ Within acceptable range'}
• Good Saves: ${data.goodSaves || 0} — proactive hazard identification
• Compliments: ${data.compliments || 0} — positive client feedback

OVERALL ASSESSMENT
${data.revenueInspectedSafety >= 90 && data.revenueInspectedCommercial >= 90 && data.incidents <= 2 && data.avgDeficiencyClosedDays <= 2
  ? 'Strong performance across all key metrics. Continue current operational approach.'
  : 'Some metrics need attention. See flagged items above for specific improvement areas.'}

RECOMMENDED ACTIONS
1. ${data.revenueInspectedSafety < 90 ? 'Prioritize safety inspection coverage — schedule catch-up inspections for uncovered sites' : 'Maintain current safety inspection cadence'}
2. ${data.incidents > 2 ? 'Conduct incident review meetings for all reported incidents — identify root causes' : 'Continue incident prevention protocols'}
3. ${data.avgDeficiencyClosedDays > 2 ? 'Accelerate deficiency resolution — target same-day closure where possible' : 'Maintain strong deficiency closure times'}
4. Document good saves and compliments for QBU reporting`,

      inspectionAnalysis: `INSPECTION ANALYSIS — ALL VPS

This analysis covers inspection compliance across the operations team. Key findings:

1. Safety inspection rates range from 86.3% to 94.2% — company average is approximately 89.3%
2. Commercial inspection rates range from 88.7% to 96.1% — company average is approximately 91.8%
3. VPs below the 90% safety target need immediate inspection catch-up plans
4. Best performer for combined compliance: Elena Grant (94.2% safety, 96.1% commercial)

Recommended actions:
• Schedule weekly inspection cadence reviews for VPs below target
• Share best practices from top-performing VPs
• Track week-over-week improvement for flagged VPs`,
    },
    admin: {
      executiveBriefing: `EXECUTIVE BRIEFING — ${co.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOP 3 PRIORITIES THIS WEEK
1. Contract renewals: 4 contracts expiring within 90 days — renewal conversations should be in progress
2. Operations: 2 VPs below 90% safety inspection target — needs management attention
3. AR Collections: 3 clients with 60+ day balances — follow up before quarter end

CROSS-DEPARTMENT RISKS
• Rising AR aging combined with upcoming contract renewals could affect retention negotiations
• Elevated incidents in one VP territory may signal staffing or training gaps
• Benefits enrollment deadlines approaching — incomplete enrollments create compliance exposure

OPPORTUNITIES
• TBI pending amounts represent immediate invoicing opportunity ($286K+ across portfolio)
• Strong compliment and good save numbers — use in QBU presentations and renewal meetings
• Shared-savings positioning for renewal discussions

RECOMMENDED EXECUTIVE ACTIONS
1. Schedule VP operations review for territories below inspection targets
2. Brief sales team on AR status before renewal meetings — ensure clean billing relationship
3. Confirm all benefits enrollments complete before deadline
4. Review TBI invoicing pipeline with finance team`,

      crossModuleAnalysis: `CROSS-MODULE ANALYSIS

Analyzing connections across departments reveals several actionable insights:

1. SALES + FINANCE: Contracts approaching renewal with outstanding AR balances should be prioritized for collection before renewal meetings begin. Clean billing relationships strengthen renewal negotiations.

2. OPS + SALES: VP performance data (inspection rates, incident counts) should be packaged for QBU presentations and renewal briefs. Strong metrics are the best retention tool.

3. HR + OPS: Union rate changes impact operational budgets. Coordinate with finance on APC adjustments for affected contracts.

4. PURCHASING + OPS: Reorder alerts for cleaning supplies could indicate increased operational demand. Cross-reference with work ticket volume.`,
    },
    purchasing: {
      reorderAnalysis: `Reorder Analysis — ${data.item || 'Item'}

Current Stock: ${data.currentStock || 'N/A'} units
Par Level: ${data.parLevel || 'N/A'} units
Monthly Usage: ${data.monthlyUsage || 'N/A'} units
Lead Time: ${data.leadTime || 'N/A'}

Recommendation: Order ${data.monthlyUsage ? Math.ceil(data.monthlyUsage * 2) : 'XX'} units to cover 2 months of usage plus safety stock.`,
    },
    qbu: {
      generateQBU: (() => {
        const c = data.cover || data;
        const clientName = c.clientName || c.client || '[Client Name]';
        const quarter = c.quarter || 'Q1 2026';
        const safetyTheme = data.safety?.theme || '[PLACEHOLDER: safety theme]';
        const achievements = data.executive?.achievements?.filter(Boolean) || [];
        const challenges = data.executive?.challenges?.filter(Boolean) || [];
        const innovations = data.executive?.innovations?.filter(Boolean) || [];
        const projects = data.projects?.completed?.filter(r => r.description) || [];
        const testimonials = data.projects?.testimonials?.filter(r => r.quote) || [];
        const photoCount = data.projects?.photos?.length || 0;
        const goalStatement = data.roadmap?.goalStatement || '[PLACEHOLDER: quarter goal]';

        return `QUARTERLY BUSINESS UPDATE
${clientName} — ${quarter}
${c.jobName ? `Job: ${c.jobName} (${c.jobNumber || ''})` : ''}
Prepared: ${c.date || 'February 2026'}
${c.regionVP ? `Region VP: ${c.regionVP}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SLIDE 1: COVER
${co}
Quarterly Business Update — ${quarter}
${clientName}
${c.aaTeam?.filter(t => t.name).length ? `\nOur Team: ${c.aaTeam.filter(t => t.name).map(t => `${t.name}, ${t.title}`).join(' | ')}` : ''}
${c.clientTeam?.filter(t => t.name).length ? `Client Team: ${c.clientTeam.filter(t => t.name).map(t => `${t.name}, ${t.title}`).join(' | ')}` : ''}

SLIDE 2: SAFETY MOMENT — ${safetyTheme.toUpperCase()}
${data.safety?.keyTips || '[PLACEHOLDER: 3-4 key safety tips]'}

Quick Reminders:
${data.safety?.quickReminders || '[PLACEHOLDER: 2-3 quick reminders]'}

Why It Matters:
${data.safety?.whyItMatters || '[PLACEHOLDER: explanation]'}

Recordable Incidents: ${data.safety?.incidents?.filter(r => r.location).length ? data.safety.incidents.filter(r => r.location).map(r => `${r.location}: ${[r.q1,r.q2,r.q3,r.q4].filter(Boolean).reduce((s,v) => s + Number(v), 0)} total`).join(', ') : '0 — zero recordables this period'}

${data.safety?.goodSaves?.filter(r => r.location).length ? `Good Saves:\n${data.safety.goodSaves.filter(r => r.location).map(r => `• ${r.location}: ${r.hazard} → ${r.action}`).join('\n')}` : ''}

SLIDE 3: WORK TICKETS — YoY COMPARISON
${data.workTickets?.locations?.filter(r => r.location).length ? data.workTickets.locations.filter(r => r.location).map(r => {
  const pct = r.priorYear && r.currentYear ? (((Number(r.currentYear) - Number(r.priorYear)) / Number(r.priorYear)) * 100).toFixed(1) : 'N/A';
  return `• ${r.location}: ${r.priorYear || '?'} → ${r.currentYear || '?'} (${pct}% change)`;
}).join('\n') : '[PLACEHOLDER: work ticket data by location]'}

Key Takeaway: ${data.workTickets?.keyTakeaway || '[PLACEHOLDER: what drove the change]'}
${data.workTickets?.eventsSupported ? `\nEvents Supported:\n${data.workTickets.eventsSupported}` : ''}

SLIDE 4: AUDITS & CORRECTIVE ACTIONS
${data.audits?.auditExplanation ? `Audit Trend: ${data.audits.auditExplanation}` : '[PLACEHOLDER: audit trend explanation]'}
${data.audits?.actionExplanation ? `Action Trend: ${data.audits.actionExplanation}` : ''}

${data.audits?.topAreas?.filter(r => r.count).length ? `Top Corrective Action Areas:\n${data.audits.topAreas.filter(r => r.count).map(r => `• ${r.area}: ${r.count}`).join('\n')}` : '[PLACEHOLDER: top corrective action areas with counts]'}

SLIDE 5: EXECUTIVE SUMMARY

Key Achievements:
${achievements.length ? achievements.map((a, i) => `${i+1}. ${a}`).join('\n') : '[PLACEHOLDER: 3-5 concrete accomplishments]'}

Strategic Challenges:
${challenges.length ? challenges.map((c, i) => `${i+1}. ${c}`).join('\n') : '[PLACEHOLDER: 2-3 honest challenges]'}

Innovation Milestones:
${innovations.length ? innovations.map((n, i) => `${i+1}. ${n}`).join('\n') : '[PLACEHOLDER: 2-5 tech/process improvements]'}

SLIDE 6: COMPLETED PROJECTS
${projects.length ? projects.map(p => `• [${p.category}] ${p.description}`).join('\n') : '[PLACEHOLDER: completed projects by category]'}

${photoCount > 0 ? `[${photoCount} project photo${photoCount > 1 ? 's' : ''} to be inserted — see captions below]\n${data.projects.photos.filter(p => p.caption).map(p => `  📷 ${p.caption}${p.location ? ` (${p.location})` : ''}`).join('\n')}` : '[PLACEHOLDER: project photos]'}

${testimonials.length ? `\nClient Testimonials:\n${testimonials.map(t => `"${t.quote}"\n  — ${t.attribution}, ${t.location}`).join('\n\n')}` : ''}

SLIDE 7: CHALLENGES & ACTIONS
${data.challenges?.items?.filter(r => r.challenge).length ? data.challenges.items.filter(r => r.challenge).map(r => `• ${r.location}: ${r.challenge}\n  → Action: ${r.action}`).join('\n') : '[PLACEHOLDER: recurring challenges with corresponding actions]'}

${data.challenges?.priorFollowUp?.filter(r => r.action).length ? `\nPrior Quarter Follow-Up:\n${data.challenges.priorFollowUp.filter(r => r.action).map(r => `• ${r.action} — ${r.status}${r.notes ? ` (${r.notes})` : ''}`).join('\n')}` : ''}

SLIDE 8: FINANCIAL OVERVIEW
${data.financial?.totalOutstanding ? `Total Outstanding: ${data.financial.totalOutstanding} (as of ${data.financial.asOfDate || 'current'})` : '[PLACEHOLDER: financial data]'}
${data.financial?.bucket30 ? `Aging: 1-30: ${data.financial.bucket30} | 31-60: ${data.financial.bucket60} | 61-90: ${data.financial.bucket90} | 91+: ${data.financial.bucket91}` : ''}
${data.financial?.strategyNotes?.filter(Boolean).length ? `\nStrategy Notes:\n${data.financial.strategyNotes.filter(Boolean).map((n, i) => `${i+1}. ${n}`).join('\n')}` : ''}

SLIDE 9: INNOVATION & ROADMAP
${data.roadmap?.highlights?.filter(h => h.innovation).length ? data.roadmap.highlights.filter(h => h.innovation).map(h => `• ${h.innovation}: ${h.description} → ${h.benefit}`).join('\n') : '[PLACEHOLDER: innovation highlights]'}

Next Quarter Plan:
${data.roadmap?.schedule?.filter(s => s.initiative).length ? data.roadmap.schedule.filter(s => s.initiative).map(s => `• ${s.month}: ${s.initiative} — ${s.details}`).join('\n') : '[PLACEHOLDER: month-by-month roadmap]'}

Quarter Goal: ${goalStatement}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Items marked [PLACEHOLDER] require data from the intake form.
${photoCount > 0 ? `📷 ${photoCount} photo${photoCount > 1 ? 's' : ''} ready for deck insertion.` : ''}`;
      })(),
    },
    sales: {
      renewalBrief: `CONTRACT RENEWAL BRIEF

Client: ${data.client || '[Client]'}
Site: ${data.site || '[Site]'}
Contract Expiry: ${data.contractEnd || '[Date]'} (${data.daysRemaining || '?'} days remaining)
Account Manager: ${data.accountManager || '[N/A]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RELATIONSHIP SUMMARY
This is a valued client with a strong service history. Annual APC of ${data.apcAnnual || '[N/A]'} positions this as a significant account. ${data.apcPriorYear ? `Prior year APC was ${data.apcPriorYear}, reflecting steady growth in the partnership.` : ''}

PERFORMANCE HIGHLIGHTS TO LEAD WITH
• Strong client retention rate — our track record speaks for itself
• Consistent SLA compliance across all service areas
• Dedicated account management with proactive communication
• Employee-focused culture driving frontline quality

PRICING CONSIDERATIONS
${data.apcPriorYear && data.apcAnnual ? `Year-over-year change: ${(((Number(String(data.apcAnnual).replace(/[^0-9]/g, '')) - Number(String(data.apcPriorYear).replace(/[^0-9]/g, ''))) / Number(String(data.apcPriorYear).replace(/[^0-9]/g, ''))) * 100).toFixed(1)}%. This aligns with typical CPI and wage adjustments.` : '[PLACEHOLDER: need prior year data for variance]'}
• Review union rate change impacts for the upcoming period
• Consider shared-savings programs as a retention incentive

TBI UPSELL OPPORTUNITY
${data.tbiYtd ? `TBI YTD of ${data.tbiYtd} shows consistent demand for extra/tag work. Consider rolling recurring TBI items into the base contract scope to simplify billing and lock in revenue.` : 'Review TBI history for upsell opportunities.'}

RECOMMENDED NEXT STEPS
1. Schedule renewal meeting ${data.daysRemaining && Number(data.daysRemaining) < 60 ? '— URGENT, less than 60 days remaining' : 'within the next 2 weeks'}
2. Prepare performance summary from operational data
3. Draft renewal proposal with updated pricing
4. Identify scope expansion opportunities from TBI patterns
5. Confirm account manager availability for client presentation`,

      apcVarianceAnalysis: `APC VARIANCE ANALYSIS — ${data.client || '[Client]'}

Current Annual APC: ${data.apcAnnual || '[N/A]'}
Prior Year APC: ${data.apcPriorYear || '[N/A]'}
Service Type: ${data.serviceType || '[N/A]'}

${data.apcPriorYear && data.apcAnnual ? `Year-over-Year Variance: ${(((Number(String(data.apcAnnual).replace(/[^0-9]/g, '')) - Number(String(data.apcPriorYear).replace(/[^0-9]/g, ''))) / Number(String(data.apcPriorYear).replace(/[^0-9]/g, ''))) * 100).toFixed(1)}%` : '[PLACEHOLDER: need both years for calculation]'}

LIKELY DRIVERS
• Union wage increases (SEIU, IUOE schedules applied annually)
• CPI-based escalation clauses in the contract
• Scope adjustments from prior-period change orders
• Benefits cost pass-through increases

ASSESSMENT
${data.apcPriorYear && data.apcAnnual ? 'The variance falls within the typical 2-5% annual escalation range, consistent with labor cost increases and contractual adjustment clauses. No anomalies detected.' : '[PLACEHOLDER: need data to assess]'}

RECOMMENDATION
• No pricing discussion needed at this time — variance is within expected parameters
• Document the drivers for renewal negotiation preparation
• Track TBI separately to identify scope creep vs. true extra work`,

      tbiSummary: `TBI SUMMARY — ${data.client || '[Client]'}

YTD Invoiced: ${data.tbiYtd || '[N/A]'}
Pending (Uninvoiced): ${data.tbiPending || '[N/A]'}
Annual APC: ${data.apcAnnual || '[N/A]'}
${data.tbiYtd && data.apcAnnual ? `TBI as % of APC: ${((Number(String(data.tbiYtd).replace(/[^0-9]/g, '')) + Number(String(data.tbiPending || '0').replace(/[^0-9]/g, ''))) / Number(String(data.apcAnnual).replace(/[^0-9]/g, '')) * 100).toFixed(1)}%` : ''}

ANALYSIS
${data.tbiPending && Number(String(data.tbiPending).replace(/[^0-9]/g, '')) > 0 ? `⚠ There is ${data.tbiPending} in pending TBI that needs immediate invoicing attention. Delayed invoicing impacts cash flow and can create client disputes when old charges surface.` : '✓ No pending TBI — all extra work has been invoiced.'}

RECOMMENDATIONS
1. ${data.tbiPending && Number(String(data.tbiPending).replace(/[^0-9]/g, '')) > 0 ? 'Invoice all pending TBI within the next billing cycle' : 'Continue current invoicing cadence'}
2. Review recurring TBI items for contract scope inclusion at renewal
3. Ensure all extra work has proper authorization documentation
4. Brief account manager on TBI trends for renewal discussions`,

      pipelineSummary: `SALES PIPELINE SUMMARY

Active Contracts: ${data.activeCount || '[N/A]'}
Total Annual APC: ${data.totalApc || '[N/A]'}
Expiring Within 90 Days: ${data.expiringSoonCount || '[N/A]'}
In Renewal: ${data.inRenewalCount || '[N/A]'}
TBI Pending: ${data.totalTbiPending || '[N/A]'}

PIPELINE HEALTH: GOOD
Our strong retention rate means the renewal pipeline is primarily a timing and execution exercise, not a risk exercise. However, attention is needed on upcoming expirations.

PRIORITY ACTIONS (NEXT 30 DAYS)
1. Schedule renewal meetings for all contracts expiring within 60 days
2. Prepare performance packages (operational data, QBU summaries) for each renewal
3. Invoice all pending TBI before renewal conversations begin
4. Brief account managers on pricing strategy for each renewal

RISK AREAS
${data.expiringSoonCount && Number(data.expiringSoonCount) > 0 ? `• ${data.expiringSoonCount} contracts approaching expiration — ensure all have active renewal conversations` : '• No immediate expiration risks'}
${data.inRenewalCount && Number(data.inRenewalCount) > 0 ? `• ${data.inRenewalCount} contracts in active renewal — monitor negotiation progress` : ''}

REVENUE AT RISK
Contracts expiring in the next 90 days represent significant annual APC. With our retention track record, conversion probability is high, but proactive engagement is essential.`,
    },
    salesDeck: {
      generateDeck: `SALES PRESENTATION — ${data.prospect || '[Prospect]'}
Industry: ${data.industry || '[Industry]'}
Facility Type: ${data.facilityType || '[Type]'}
${data.approxSqft ? `Approx. Size: ${data.approxSqft}` : ''}
${data.presentingTo ? `Audience: ${data.presentingTo}` : ''}
${data.presentationDate ? `Date: ${data.presentationDate}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SLIDE 1: COVER
${co}
"The Performance-Focused Choice"
Prepared for: ${data.prospect || '[Prospect]'}${data.site ? ` — ${data.site}` : ''}
${data.aaTeam ? `\nPresented by: ${data.aaTeam}` : ''}
${data.presentationDate ? `Date: ${data.presentationDate}` : ''}

Presenter Notes: Open with a warm, confident introduction. Reference any prior conversations or site visits. Set the tone: "We're here to show you why performance matters more than scale."

SLIDE 2: WHY PERFORMANCE MATTERS
• Industry-leading client retention rate — our clients stay because we deliver
• Consistent SLA compliance across all accounts
• Long-term client relationships built on trust and results
• Cost efficiency consistently below industry benchmarks
• Stable leadership and continuous operations

Presenter Notes: This is our strongest opening. Let the numbers speak. Pause after retention rate — it's our most differentiating metric. If asked about comparison to ${data.currentProvider || 'their current provider'}, stay positive: "We focus on what we deliver, not what others don't."

SLIDE 3: UNDERSTANDING YOUR NEEDS
${data.concerns ? `Key challenges identified:\n${data.concerns.split('\n').filter(Boolean).map(line => `• ${line.trim()}`).join('\n') || data.concerns}` : '[PLACEHOLDER: prospect-specific pain points]'}
${data.reasonForChange ? `\nDriver for change: ${data.reasonForChange}` : ''}
${data.specialRequirements ? `\nSpecial requirements noted:\n• ${data.specialRequirements}` : ''}

Presenter Notes: Mirror the prospect's language back to them. Show that you listened during discovery. ${data.presentingTo ? `Address ${data.presentingTo} directly by name when discussing their specific pain points.` : 'Address each stakeholder by name when discussing their specific concerns.'}

SLIDE 4: OUR APPROACH — ${(data.industry || 'YOUR INDUSTRY').toUpperCase()}
• Deep experience in ${data.industry || '[industry]'} environments — we understand the regulatory, operational, and cultural nuances
• ${data.facilityType ? `Specialized protocols for ${data.facilityType} operations` : 'Facility-specific protocols tailored to your environment'}
• Manager-heavy model ensures daily on-site accountability and oversight
• Single-point accountability across ${data.servicesRequested || 'janitorial, grounds, and MEP'}

Presenter Notes: This is where we connect our capabilities to their specific environment. Reference similar clients in ${data.industry || 'their industry'} (check with sales team for approved references).

SLIDE 5: PEOPLE & CULTURE
• Our team members have a direct stake in your facility's success
• Employee-focused culture — dignity and respect drive service quality
• Structured service model with specialist roles for clarity and accountability
• Experienced in managing union workforces seamlessly
${data.specialRequirements && data.specialRequirements.toLowerCase().includes('union') ? '• Direct experience with major building service unions in the market' : ''}

Presenter Notes: Our people-first approach is not a slogan — it's how we operate. Give a concrete example: "When our team members feel respected and valued, they take ownership of your facility. That's why our frontline retention is among the highest in the industry."

SLIDE 6: TECHNOLOGY & INNOVATION
• Company technology platform: QA tracking, training, AI-powered validation
• Real-time task completion tracking — full visibility into daily operations
• Predictive maintenance via CMMS integration
• Transparent reporting dashboards — no surprises, no black boxes
• Robotics and autonomous equipment where they improve outcomes, not replace people

Presenter Notes: Don't lead with tech — lead with what it solves. "You mentioned ${data.concerns ? 'visibility into daily operations' : 'wanting better reporting'} — here's exactly how we deliver that." Offer to demo the platform if possible.

SLIDE 7: PARTNERSHIP MODEL
• Shared-savings program — verified efficiency gains returned to you
• Dedicated account management team with regional VP oversight
• Regular Quarterly Business Update presentations with actionable metrics
• Continuous improvement built into the contract structure
• Transition plan: 90-day onboarding with milestone checkpoints

Presenter Notes: The shared-savings model is a powerful differentiator. Frame it as aligned incentives: "We only save money when we find real efficiencies — and we share those savings with you. That's alignment you won't find with other providers."

SLIDE 8: WHY US
• Performance-focused, not scale-focused — we choose partnerships carefully
• Our team is invested in your success
• Leadership stability and operational continuity
• ${data.emphasisAreas || 'Enterprise capabilities with relationship-driven service'}
• References available from similar ${data.industry || '[industry]'} accounts

Presenter Notes: Close strong. "We're not the biggest — we're the best fit. And our retention rate proves that our clients agree." Make eye contact with the decision maker.

SLIDE 9: NEXT STEPS
• Facility walkthrough and detailed needs assessment
• Customized scope and pricing proposal within 2 weeks of walkthrough
• Reference calls with similar ${data.industry || '[industry]'} clients
• Proposed transition timeline if we move forward together

Presenter Notes: Be specific about next steps and timelines. Offer to schedule the walkthrough before leaving the meeting. Leave behind: company overview one-pager + contact card.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Review all content against claim governance before presenting. Items marked [PLACEHOLDER] require prospect-specific data.

<!-- NARRATIVE:COVER:TAGLINE -->
The Performance-Focused Choice
<!-- /NARRATIVE -->

<!-- NARRATIVE:S2:BULLETS -->
Industry-leading client retention rate — our clients stay because we deliver
Consistent SLA compliance across all managed accounts
Long-term client relationships built on trust and results
Cost efficiency consistently below industry benchmarks
Stable leadership and continuous operations
<!-- /NARRATIVE -->

<!-- NARRATIVE:S2:NOTES -->
This is our strongest opening. Let the numbers speak. Pause after the retention rate — it's our most differentiating metric. If asked about comparison to their current provider, stay positive: "We focus on what we deliver, not what others don't."
<!-- /NARRATIVE -->

<!-- NARRATIVE:S3:BULLETS -->
${data.concerns ? data.concerns.split('\n').filter(Boolean).map(line => line.trim()).join('\n') || 'Key challenges identified from discovery conversations' : 'Key challenges identified from discovery conversations'}
${data.reasonForChange ? `Driver for change: ${data.reasonForChange}` : 'Contract expiring — exploring options for improved service'}
${data.specialRequirements ? `Special requirements: ${data.specialRequirements}` : 'No special requirements noted — standard facility services scope'}
<!-- /NARRATIVE -->

<!-- NARRATIVE:S3:NOTES -->
Mirror the prospect's language back to them. Show that you listened during discovery. Address each stakeholder by name when discussing their specific pain points. This builds trust and shows a consultative approach, not a cookie-cutter one.
<!-- /NARRATIVE -->

<!-- NARRATIVE:S4:BULLETS -->
Deep experience in ${data.industry || 'facility'} environments — we understand the regulatory, operational, and cultural nuances
${data.facilityType ? `Specialized protocols for ${data.facilityType} operations` : 'Facility-specific protocols tailored to your environment'}
Manager-heavy model ensures daily on-site accountability and oversight
Single-point accountability across ${data.servicesRequested || 'janitorial, grounds, and MEP'}
Structured service model with specialist roles for clarity
<!-- /NARRATIVE -->

<!-- NARRATIVE:S4:NOTES -->
This is where we connect our capabilities to their specific environment. Reference similar clients in ${data.industry || 'their industry'} when possible. Emphasize that our approach is tailored, not templated.
<!-- /NARRATIVE -->

<!-- NARRATIVE:S5:BULLETS -->
Our team members have a direct stake in your facility's success
Employee-focused culture — dignity and respect drive service quality
Structured service model with specialist roles for clarity and accountability
Experienced in managing union workforces seamlessly
Industry-leading frontline retention driven by our culture
<!-- /NARRATIVE -->

<!-- NARRATIVE:S5:NOTES -->
Our people-first approach is not a slogan — it's how we operate. Give a concrete example: "When our team members feel respected and valued, they take ownership of your facility. That's why our frontline retention is among the highest in the industry."
<!-- /NARRATIVE -->

<!-- NARRATIVE:S6:BULLETS -->
Company technology platform: QA tracking, training, AI-powered validation
Real-time task completion tracking — full visibility into daily operations
Predictive maintenance via CMMS integration
Transparent reporting dashboards — no surprises, no black boxes
Robotics and autonomous equipment where they improve outcomes, not replace people
<!-- /NARRATIVE -->

<!-- NARRATIVE:S6:NOTES -->
Don't lead with tech — lead with what it solves. "You mentioned wanting better visibility into daily operations — here's exactly how we deliver that." Offer to demo the platform if possible.
<!-- /NARRATIVE -->

<!-- NARRATIVE:S7:BULLETS -->
Shared-savings program — verified efficiency gains returned to you
Dedicated account management team with regional VP oversight
Regular Quarterly Business Update presentations with actionable metrics
Continuous improvement built into the contract structure
90-day transition plan with milestone checkpoints
<!-- /NARRATIVE -->

<!-- NARRATIVE:S7:NOTES -->
The shared-savings model is a powerful differentiator. Frame it as aligned incentives: "We only save money when we find real efficiencies — and we share those savings with you. That's alignment you won't find with other providers."
<!-- /NARRATIVE -->

<!-- NARRATIVE:S8:BULLETS -->
Performance-focused, not scale-focused — we choose partnerships carefully
Our team is invested in your success
Leadership stability and operational continuity
Enterprise capabilities with relationship-driven service
References available from similar ${data.industry || 'industry'} accounts
<!-- /NARRATIVE -->

<!-- NARRATIVE:S8:NOTES -->
Close strong. "We're not the biggest — we're the best fit. And our retention rate proves that our clients agree." Make eye contact with the decision maker. This is the slide where confidence matters most.
<!-- /NARRATIVE -->

<!-- NARRATIVE:S9:BULLETS -->
Facility walkthrough and detailed needs assessment
Customized scope and pricing proposal within 2 weeks of walkthrough
Reference calls with similar ${data.industry || 'industry'} clients
Proposed transition timeline if we move forward together
<!-- /NARRATIVE -->

<!-- NARRATIVE:S9:NOTES -->
Be specific about next steps and timelines. Offer to schedule the walkthrough before leaving the meeting. Leave behind: company overview one-pager + contact card. The goal is to keep momentum and demonstrate responsiveness from day one.
<!-- /NARRATIVE -->`,
    },
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mocks[agentKey]?.[actionKey] || 'Mock response — connect an API key for live AI responses.');
    }, 1500);
  });
}
