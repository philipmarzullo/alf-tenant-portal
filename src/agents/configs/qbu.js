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
      description: 'Generate a Quarterly Business Update deck from full intake data',
      promptTemplate: (data) => {
        const c = data.cover || data;
        const sections = [];

        sections.push(`Generate a complete Quarterly Business Update deck for:`);
        sections.push(`Client: ${c.clientName || c.client || '[Client]'}`);
        sections.push(`Quarter: ${c.quarter || '[Quarter]'}`);
        sections.push(`Date: ${c.date || '[Date]'}`);
        if (c.jobName) sections.push(`Job: ${c.jobName} (${c.jobNumber || 'N/A'})`);
        if (c.regionVP) sections.push(`Region VP: ${c.regionVP}`);

        if (c.aaTeam?.filter(t => t.name).length) {
          sections.push(`\nA&A Team: ${c.aaTeam.filter(t => t.name).map(t => `${t.name} (${t.title})`).join(', ')}`);
        }
        if (c.clientTeam?.filter(t => t.name).length) {
          sections.push(`Client Team: ${c.clientTeam.filter(t => t.name).map(t => `${t.name} (${t.title})`).join(', ')}`);
        }

        if (data.safety) {
          const s = data.safety;
          sections.push(`\n--- SAFETY ---`);
          if (s.theme) sections.push(`Safety Theme: ${s.theme}`);
          if (s.keyTips) sections.push(`Key Tips: ${s.keyTips}`);
          if (s.quickReminders) sections.push(`Reminders: ${s.quickReminders}`);
          if (s.whyItMatters) sections.push(`Why It Matters: ${s.whyItMatters}`);
          if (s.incidents?.filter(r => r.location).length) {
            sections.push(`Incidents by location: ${s.incidents.filter(r => r.location).map(r => `${r.location}: Q1=${r.q1||0} Q2=${r.q2||0} Q3=${r.q3||0} Q4=${r.q4||0}`).join('; ')}`);
          }
          if (s.goodSaves?.filter(r => r.location).length) {
            sections.push(`Good Saves: ${s.goodSaves.filter(r => r.location).map(r => `${r.location}: ${r.hazard} → ${r.action}`).join('; ')}`);
          }
        }

        if (data.workTickets) {
          const w = data.workTickets;
          sections.push(`\n--- WORK TICKETS ---`);
          if (w.locations?.filter(r => r.location).length) {
            sections.push(`YoY: ${w.locations.filter(r => r.location).map(r => `${r.location}: prior=${r.priorYear} current=${r.currentYear}`).join('; ')}`);
          }
          if (w.keyTakeaway) sections.push(`Takeaway: ${w.keyTakeaway}`);
          if (w.eventsSupported) sections.push(`Events: ${w.eventsSupported}`);
        }

        if (data.audits) {
          const a = data.audits;
          sections.push(`\n--- AUDITS ---`);
          if (a.auditExplanation) sections.push(`Audit changes: ${a.auditExplanation}`);
          if (a.actionExplanation) sections.push(`Action changes: ${a.actionExplanation}`);
          if (a.topAreas?.filter(r => r.count).length) {
            sections.push(`Top areas: ${a.topAreas.filter(r => r.count).map(r => `${r.area}: ${r.count}`).join(', ')}`);
          }
        }

        if (data.executive) {
          const e = data.executive;
          sections.push(`\n--- EXECUTIVE SUMMARY ---`);
          if (e.achievements?.filter(Boolean).length) sections.push(`Achievements: ${e.achievements.filter(Boolean).join('; ')}`);
          if (e.challenges?.filter(Boolean).length) sections.push(`Challenges: ${e.challenges.filter(Boolean).join('; ')}`);
          if (e.innovations?.filter(Boolean).length) sections.push(`Innovation Milestones: ${e.innovations.filter(Boolean).join('; ')}`);
        }

        if (data.projects) {
          const p = data.projects;
          sections.push(`\n--- PROJECTS ---`);
          if (p.completed?.filter(r => r.description).length) {
            sections.push(`Completed: ${p.completed.filter(r => r.description).map(r => `[${r.category}] ${r.description}`).join('; ')}`);
          }
          if (p.photos?.length) sections.push(`Photos to include: ${p.photos.length} (captions: ${p.photos.filter(ph => ph.caption).map(ph => ph.caption).join(', ')})`);
          if (p.testimonials?.filter(r => r.quote).length) {
            sections.push(`Testimonials: ${p.testimonials.filter(r => r.quote).map(r => `"${r.quote}" — ${r.attribution}, ${r.location}`).join('; ')}`);
          }
        }

        if (data.challenges) {
          const ch = data.challenges;
          sections.push(`\n--- CHALLENGES & ACTIONS ---`);
          if (ch.items?.filter(r => r.challenge).length) {
            sections.push(`Current: ${ch.items.filter(r => r.challenge).map(r => `${r.location}: ${r.challenge} → ${r.action}`).join('; ')}`);
          }
          if (ch.priorFollowUp?.filter(r => r.action).length) {
            sections.push(`Prior follow-up: ${ch.priorFollowUp.filter(r => r.action).map(r => `${r.action} (${r.status}) ${r.notes}`).join('; ')}`);
          }
        }

        if (data.financial) {
          const f = data.financial;
          sections.push(`\n--- FINANCIAL ---`);
          if (f.totalOutstanding) sections.push(`Outstanding: ${f.totalOutstanding} as of ${f.asOfDate}`);
          if (f.bucket30 || f.bucket60 || f.bucket90 || f.bucket91) {
            sections.push(`Aging: 1-30: ${f.bucket30}, 31-60: ${f.bucket60}, 61-90: ${f.bucket90}, 91+: ${f.bucket91}`);
          }
          if (f.strategyNotes?.filter(Boolean).length) sections.push(`Strategy: ${f.strategyNotes.filter(Boolean).join('; ')}`);
        }

        if (data.roadmap) {
          const r = data.roadmap;
          sections.push(`\n--- INNOVATION & ROADMAP ---`);
          if (r.highlights?.filter(h => h.innovation).length) {
            sections.push(`Highlights: ${r.highlights.filter(h => h.innovation).map(h => `${h.innovation}: ${h.description} → ${h.benefit}`).join('; ')}`);
          }
          if (r.schedule?.filter(s => s.initiative).length) {
            sections.push(`Roadmap: ${r.schedule.filter(s => s.initiative).map(s => `${s.month}: ${s.initiative} — ${s.details}`).join('; ')}`);
          }
          if (r.goalStatement) sections.push(`Goal: ${r.goalStatement}`);
        }

        sections.push(`\nFormat this as a complete slide-by-slide QBU presentation with: Cover, Safety Moment, Work Tickets, Audits, Executive Summary, Projects & Photos, Challenges, Financial, Innovation & Roadmap. Use [PLACEHOLDER] for any missing data. Follow A&A brand standards.`);

        return sections.join('\n');
      },
    },
  },
};
