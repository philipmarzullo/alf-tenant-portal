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
    },
    purchasing: {
      reorderAnalysis: `Reorder Analysis — ${data.item || 'Item'}

Current Stock: ${data.currentStock || 'N/A'} units
Par Level: ${data.parLevel || 'N/A'} units
Monthly Usage: ${data.monthlyUsage || 'N/A'} units
Lead Time: ${data.leadTime || 'N/A'}

Recommendation: Order ${data.monthlyUsage ? Math.ceil(data.monthlyUsage * 2) : 'XX'} units to cover 2 months of usage plus safety stock.`,
    },
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mocks[agentKey]?.[actionKey] || 'Mock response — connect an API key for live AI responses.');
    }, 1500);
  });
}
