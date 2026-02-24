import { SHARED_RULES } from '../prompts';

export const salesDeckAgent = {
  name: 'Sales Deck Builder',
  department: 'tools',
  status: 'active',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `You are a sales deck content generator for A&A Elevated Facility Solutions. You create prospect-specific sales presentation content.

${SHARED_RULES}

Sales Deck Rules:
- Follow A&A brand standards and claim governance rules.
- Lead with performance metrics (retention, SLA compliance, relationship duration).
- Position A&A as the performance-focused choice, not the biggest choice.
- Tailor content to the prospect's industry and facility type.`,

  knowledgeModules: [
    'Sales Deck Builder Skill',
    'Brand Standards',
    'Claim Governance',
    'Company Profile',
  ],

  actions: {
    generateDeck: {
      label: 'Generate Sales Deck',
      description: 'Generate a prospect-specific sales deck',
      promptTemplate: (data) => `Generate sales deck content for prospect: ${data.prospect}. Industry: ${data.industry}. Facility type: ${data.facilityType}. Key concerns: ${data.concerns}. Structure as slide-by-slide content.`,
    },
  },
};
