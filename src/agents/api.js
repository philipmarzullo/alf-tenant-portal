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
export async function callAgent(agentKey, actionKey, data, apiKey) {
  const agent = getAgent(agentKey);
  const action = getAgentAction(agentKey, actionKey);

  if (!agent || !action) {
    throw new Error(`Agent or action not found: ${agentKey}/${actionKey}`);
  }

  const userMessage = action.promptTemplate(data);

  // If no API key, return a mock response for demo purposes
  if (!apiKey) {
    return getMockResponse(agentKey, actionKey, data);
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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

  if (!apiKey) {
    return 'To enable live AI responses, add your Anthropic API key in Settings. For now, this is a demo of the chat interface — the HR Agent would respond with context-aware answers based on loaded SOPs and company knowledge.';
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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
      generateQBU: `QUARTERLY BUSINESS UPDATE
${data.client || '[Client Name]'} — ${data.quarter || 'Q1 2026'}
Prepared: ${data.date || 'February 2026'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY
A&A continued to deliver consistent, high-quality service across all contracted areas during ${data.quarter || 'Q1 2026'}. Key highlights include maintained SLA compliance above 99%, successful implementation of updated cleaning protocols, and positive feedback from facility occupants.

PERFORMANCE METRICS
• SLA Compliance: [PLACEHOLDER: actual %] (target: 99%+)
• Quality Inspection Average: [PLACEHOLDER: score]/100
• Work Order Response Time: [PLACEHOLDER: avg hours]
• Client Satisfaction Score: [PLACEHOLDER: score]/5.0
• Staff Retention (site-level): [PLACEHOLDER: %]

SERVICE HIGHLIGHTS
• [PLACEHOLDER: specific achievements for this client]
• Maintained full staffing levels throughout the quarter
• Zero safety incidents reported
• Completed [PLACEHOLDER: number] preventive maintenance tasks ahead of schedule

CONTINUOUS IMPROVEMENT
• Implemented updated sanitization protocols per latest ISSA standards
• [PLACEHOLDER: site-specific improvements]
• Staff training hours: [PLACEHOLDER: hours] (target exceeded)

NEXT QUARTER OUTLOOK
• Seasonal grounds maintenance transition planning
• [PLACEHOLDER: upcoming initiatives]
• Scheduled deep-clean projects: [PLACEHOLDER: details]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Items marked [PLACEHOLDER] require actual data from operations.`,
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
