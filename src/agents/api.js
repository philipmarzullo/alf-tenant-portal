import { getAgent, getAgentAction } from './registry';

const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Call the Anthropic Claude API with an agent configuration.
 *
 * @param {string} agentKey - Key from the registry (e.g., 'hr', 'finance')
 * @param {string} actionKey - Action within the agent (e.g., 'draftReminder')
 * @param {object} data - Data to populate the prompt template
 * @param {string} [apiKey] - Anthropic API key (from env or user input)
 * @returns {Promise<string>} - The assistant's response text
 */
function getStoredKey() {
  try { return localStorage.getItem('aa_anthropic_key') || ''; } catch { return ''; }
}

export async function callAgent(agentKey, actionKey, data, apiKey) {
  const agent = getAgent(agentKey);
  const action = getAgentAction(agentKey, actionKey);

  if (!agent || !action) {
    throw new Error(`Agent or action not found: ${agentKey}/${actionKey}`);
  }

  const userMessage = action.promptTemplate(data);
  const key = apiKey || getStoredKey();

  // If no API key, return a mock response for demo purposes
  if (!key) {
    return getMockResponse(agentKey, actionKey, data);
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: agent.model,
      max_tokens: 1024,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result.content?.[0]?.text || 'No response generated.';
}

/**
 * Chat with an agent (multi-turn).
 */
export async function chatWithAgent(agentKey, messages, apiKey) {
  const agent = getAgent(agentKey);
  if (!agent) throw new Error(`Agent not found: ${agentKey}`);

  const key = apiKey || getStoredKey();

  if (!key) {
    return 'To enable live AI responses, add your Anthropic API key in Settings. For now, this is a demo of the chat interface — the agent would respond with context-aware answers based on loaded SOPs and company knowledge.';
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: agent.model,
      max_tokens: 1024,
      system: agent.systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result.content?.[0]?.text || 'No response generated.';
}

function getMockResponse(agentKey, actionKey, data) {
  // Realistic mock responses for demo without API key
  const mocks = {
    hr: {
      draftReminder: `Subject: Action Needed — Complete Your Benefits Enrollment

Hi ${data.employeeName || 'there'},

Welcome to A&A Elevated Facility Solutions! As part of your onboarding, you're eligible to enroll in our benefits program.

You have ${data.daysRemaining || 'several'} days remaining to complete your enrollment through Employee Navigator. Here's what you need to do:

1. Log in to Employee Navigator (check your email for the invitation link)
2. Review available plan options (Medical, Dental, Vision)
3. Select your coverage level and add any dependents
4. Submit your elections before the deadline

If you have questions about plan options or need help navigating the portal, please reach out to HR — we're here to help.

Best regards,
A&A HR Team`,
      generateWinTeamUpdate: `WinTeam Update Instructions — ${data.employeeName || 'Employee'}

1. Open WinTeam → Employee Master File
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
2. Enter in WinTeam with effective date
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
- Email: hr@aaefs.com
- E-Hub upload portal
- In person to the HR office

If you're experiencing any difficulty, please don't hesitate to reach out — we're happy to help.

Best regards,
A&A HR Team`,
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

I hope this finds you well. I'm reaching out regarding your account with A&A Elevated Facility Solutions.

Our records show a current outstanding balance of ${data.total || '$XX,XXX'}. Here's a summary:
- Current (1-30 days): ${data.bucket30 || '$XX,XXX'}
- 31-60 days: ${data.bucket60 || '$XX,XXX'}
- 61-90 days: ${data.bucket90 || '$XX,XXX'}

We value our partnership and want to ensure there are no issues with the invoices. If there are any discrepancies or if you need copies of any invoices, please don't hesitate to reach out.

Could you provide an update on the expected payment schedule? We're happy to work with your team on any billing questions.

Best regards,
A&A Finance Team`,
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
A&A Elevated Facility Solutions
Quarterly Business Update — ${quarter}
${clientName}
${c.aaTeam?.filter(t => t.name).length ? `\nA&A Team: ${c.aaTeam.filter(t => t.name).map(t => `${t.name}, ${t.title}`).join(' | ')}` : ''}
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
    salesDeck: {
      generateDeck: `SALES PRESENTATION — ${data.prospect || '[Prospect]'}
Industry: ${data.industry || '[Industry]'}
Facility Type: ${data.facilityType || '[Type]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SLIDE 1: COVER
A&A Elevated Facility Solutions
"The Performance-Focused Choice"
Prepared for: ${data.prospect || '[Prospect]'}

SLIDE 2: WHY PERFORMANCE MATTERS
• 98%+ client retention rate
• 99%+ SLA compliance across all accounts
• 7+ year average client relationship
• Cost efficiency consistently below industry benchmarks

SLIDE 3: UNDERSTANDING YOUR NEEDS
${data.concerns ? `Key concerns identified:\n${data.concerns}` : '[PLACEHOLDER: prospect-specific pain points]'}

SLIDE 4: OUR APPROACH — ${(data.industry || 'Your Industry').toUpperCase()}
• Deep experience in ${data.industry || '[industry]'} environments
• Specialized protocols for ${data.facilityType || '[facility type]'} operations
• Manager-heavy model ensures daily accountability
• Single-point accountability across janitorial, grounds, and MEP

SLIDE 5: PEOPLE FIRST™
• Employee-owned (ESOP) — our team is invested in your success
• People First™ operating philosophy drives quality from the ground up
• 25+ years managing union workforces with zero labor disruptions
• SYNC task-based model: 5 specialist roles for clarity

SLIDE 6: TECHNOLOGY THAT SUPPORTS
• AA360 platform: QA tracking, analytics, AI-powered validation
• Real-time work verification and multilingual training
• Predictive maintenance capabilities via TMA integration
• Transparent reporting dashboards

SLIDE 7: PARTNERSHIP MODEL
• Glide Path shared-savings program — verified efficiency returned to you
• Dedicated account management team
• Regular QBU presentations with actionable metrics
• Continuous improvement built into the contract

SLIDE 8: NEXT STEPS
• Facility walkthrough and needs assessment
• Customized proposal within [PLACEHOLDER: timeline]
• References available from similar ${data.industry || '[industry]'} accounts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Items marked [PLACEHOLDER] require prospect-specific data.`,
    },
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mocks[agentKey]?.[actionKey] || 'Mock response — connect an API key for live AI responses.');
    }, 1500);
  });
}
