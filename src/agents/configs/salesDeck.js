import { SHARED_RULES } from '../prompts';

export const salesDeckAgent = {
  name: 'Sales Deck Builder',
  department: 'tools',
  status: 'active',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `You are a sales deck content generator for A&A Elevated Facility Solutions, a 2,000+ employee, employee-owned (ESOP) facility services company with 53 years of history and 98%+ client retention.

${SHARED_RULES}

Sales Deck Rules:
- Follow A&A brand standards and claim governance rules.
- Lead with performance metrics (98%+ retention, 99%+ SLA compliance, 7+ year avg relationships, cost efficiency below industry average).
- Position A&A as the performance-focused choice, not the biggest choice.
- Tailor content to the prospect's industry, facility type, and specific challenges.
- When a current provider is mentioned, never attack them by name — focus on A&A's strengths.
- Address the prospect's stated challenges directly with A&A's specific capabilities.
- Reference relevant A&A programs: People First, SYNC, Glide Path, AA360, Lighthouse, TMA.
- Include slide-by-slide structure with clear talking points.
- When special requirements are noted (union, LEED, 24/7), incorporate them into relevant slides.
- Keep the deck focused — 8-10 slides maximum.`,

  knowledgeModules: [
    'Sales Deck Builder Skill',
    'Brand Standards',
    'Claim Governance',
    'Company Profile',
  ],

  actions: {
    generateDeck: {
      label: 'Generate Sales Deck',
      description: 'Generate a prospect-specific sales deck with full intake context',
      promptTemplate: (data) => `Generate sales deck content for the following prospect:

PROSPECT INFORMATION
Company: ${data.prospect || '[Company Name]'}
Site: ${data.site || '[Not specified]'}
Industry/Vertical: ${data.industry || '[Not specified]'}
Facility Type: ${data.facilityType || '[Not specified]'}
Approx. Sq Ft: ${data.approxSqft || '[Not specified]'}

PRESENTATION DETAILS
Presenting To: ${data.presentingTo || '[Not specified]'}
Presentation Date: ${data.presentationDate || '[Not specified]'}
A&A Team: ${data.aaTeam || '[Not specified]'}

SCOPE OF SERVICES
${data.servicesRequested || '[Not specified]'}

CURRENT SITUATION
Current Provider: ${data.currentProvider || '[Not specified]'}
Reason for Change: ${data.reasonForChange || '[Not specified]'}

KEY CHALLENGES & PAIN POINTS
${data.concerns || '[Not specified]'}

SPECIAL REQUIREMENTS
${data.specialRequirements || '[None noted]'}

DIFFERENTIATORS TO EMPHASIZE
${data.emphasisAreas || '[Agent to determine based on context]'}

Generate a complete slide-by-slide sales deck (8-10 slides). For each slide, provide:
1. Slide title
2. Key talking points (3-5 bullets)
3. Notes for the presenter

Structure: Cover → Why Performance Matters → Understanding Your Needs → Our Approach for [Industry] → People First & ESOP → Technology & Innovation → Partnership Model → Why A&A → Next Steps.

Tailor every slide to the prospect's specific challenges and industry. Address their pain points directly with A&A capabilities.`,
    },
  },
};
