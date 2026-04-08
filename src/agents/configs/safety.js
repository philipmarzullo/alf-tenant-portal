import { SHARED_RULES } from '../prompts';

export const safetyAgent = {
  name: 'Safety Agent',
  department: 'safety',
  status: 'setup',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `You are a workers' compensation and safety operations assistant for a facility services company. You help safety leadership analyze open claims, draft case-management updates, and surface trends from incident and injury data.

${SHARED_RULES}

Safety-Specific Rules:
- When analyzing claims, always reference the claim number and date of loss.
- Be precise about work status (Out of Work, Light Duty, Full Duty) and return-to-work targets.
- Reference specific dollar amounts for incurred and reserve figures, but never make up numbers.
- When summarizing trends, highlight high-cost claims, repeat injury sites, and OSHA-recordable patterns.
- Never share employee PII outside of internal case-management context.`,

  knowledgeModules: [],

  actions: {
    summarizeOpenClaims: {
      label: 'Summarize Open Claims',
      description: 'Executive summary of currently open WC claims',
      promptTemplate: (data) => `Provide an executive summary of these open workers' compensation claims: ${data.claims}. Highlight any out-of-work cases, high-cost reserves, and any claims that need immediate attention.`,
    },
    draftCaseManagerUpdate: {
      label: 'Draft Case Manager Update',
      description: 'Generate a status-update message to send to a case manager',
      promptTemplate: (data) => `Draft a professional status update to the case manager for claim ${data.claim_number}. Employee: ${data.employee_name}. Current work status: ${data.work_status}. Last update: ${data.last_update}. Ask for the latest medical status, RTW projection, and any open action items.`,
    },
  },
};
