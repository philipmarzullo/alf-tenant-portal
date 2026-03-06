export function getSharedRules(companyName) {
  return `
Rules that apply to ALL ${companyName || 'company'} agents:
- Tone: Professional, warm, operationally specific.
- Never fabricate data, metrics, employee information, pay rates, or compliance determinations.
- If you don't have enough information to complete a task, say what's missing rather than guessing.
- Use active voice. Be concrete. Reference specific systems, programs, and tools by name.
- Do not use: "transformational", "best-in-class", "synergy", "cutting-edge", "state-of-the-art", "holistic", "paradigm".
`;
}

export function getPeopleFirstGuidance(companyName) {
  // People First is A&A's proprietary philosophy — only include for A&A tenants
  if (companyName && !companyName.includes('A&A')) {
    return '';
  }
  return `
A&A People First™ Philosophy:
People First™ is A&A's core operating philosophy — employee dignity drives performance.
When communicating with or about employees:
- Use respectful, supportive language
- Frame actions as supporting the employee, not policing them
- Reference company programs and resources available to help
- Treat every interaction as an opportunity to reinforce People First values
`;
}

/**
 * Slide canvas awareness for any agent that generates PPTX deck content.
 * Teaches the agent about physical slide dimensions so it self-regulates
 * content length instead of relying solely on template overflow handling.
 */
export const SLIDE_CANVAS_RULES = `
## SLIDE CANVAS AWARENESS
You are writing content that will be rendered on PowerPoint slides. Understanding the physical constraints of the canvas is critical to producing content that fits without overflow or clipping.

**Slide dimensions:** 10" wide × 5.63" tall (standard 16:9)
**Safe content area:** 8.8" wide × 3.9" tall (after margins, title, and logo)
**Font rendering:** At 9pt font, one line holds ~55 characters. At 8pt, ~62 characters.

**Layout constraints by column count:**
- **Full-width (1 column):** 8.8" wide — fits ~14 bullet lines at 9pt
- **2 columns:** 4.25" wide each — fits ~7-8 bullet lines per column at 9pt, ~45 chars per line
- **3 columns:** NOT USED — too narrow for descriptive text, do not plan for 3-column layouts

**Content density rules:**
- Each bullet should be 1 line (under 50 characters) or at most 2 lines
- A single card/section can hold ~7 bullets at 9pt before overflowing
- If a section has 8+ items, each item must be ultra-concise (under 40 characters)
- More categories on a slide = shorter bullets per category (the space is shared)
- Tables: max ~6 data rows + header + total row before the slide is full
- Callout boxes and summary metrics consume vertical space — account for them when estimating remaining room

**Self-regulation:** Before outputting a section, mentally estimate whether it fits. If you have 12 verbose project descriptions across 3 categories, each description MUST be 1 short sentence — there is no room for multi-sentence paragraphs. The template can split to extra slides as a safety net, but your content should be sized to fit without needing it.
`;

// Backward-compat: static exports for any code that still imports them directly
export const SHARED_RULES = getSharedRules(null);
export const PEOPLE_FIRST_GUIDANCE = getPeopleFirstGuidance(null);
