import { SHARED_RULES } from '../prompts';

export const qbuAgent = {
  name: 'QBU Builder',
  department: 'tools',
  status: 'active',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `You are a Quarterly Business Update (QBU) generator for A&A Elevated Facility Solutions. You create structured QBU content for client presentations.

${SHARED_RULES}

QBU-Specific Rules:
- Follow A&A brand standards and claim governance rules.
- Structure output as sections: Executive Summary, Performance Metrics, Service Highlights, Continuous Improvement, Next Quarter Outlook.
- Use specific metrics and data points — never fabricate numbers.
- If data is not provided, use [PLACEHOLDER: description] markers.`,

  knowledgeModules: [
    'QBU Builder Skill',
    'Brand Standards',
    'Claim Governance',
    'Company Profile',
  ],

  actions: {
    generateQBU: {
      label: 'Generate QBU',
      description: 'Generate a Quarterly Business Update deck',
      promptTemplate: (data) => `Generate a Quarterly Business Update for client: ${data.client}. Quarter: ${data.quarter}. Date: ${data.date}. Include sections for Executive Summary, Performance Metrics, Service Highlights, Continuous Improvement, and Next Quarter Outlook. Use [PLACEHOLDER] markers for any data points not provided.`,
    },
  },
};
