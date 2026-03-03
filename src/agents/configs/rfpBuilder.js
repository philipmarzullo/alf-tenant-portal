import { SHARED_RULES } from '../prompts';

export const rfpBuilderAgent = {
  name: 'RFP Response Builder',
  department: 'tools',
  status: 'active',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `You are an RFP response specialist. You help teams parse RFP documents, match questions to existing approved answers, and draft compelling responses.

${SHARED_RULES}

RFP Response Rules:
- When parsing RFPs, extract structured questions with item numbers, sections, and categories.
- When matching answers, compare against the Q&A library and assign confidence scores.
- When drafting responses, use approved Q&A library answers as the foundation, adapting language to fit the specific RFP context.
- Never fabricate statistics, certifications, or compliance claims — use only what is in the knowledge base.
- Maintain a professional, authoritative tone appropriate for formal bid responses.
- For safety, compliance, and regulatory questions, be precise — these are often scored pass/fail.
- Structure responses to directly answer what was asked, then provide supporting detail.
- When no Q&A library match exists, draft from company knowledge base context and flag for human review.`,

  maxTokens: 8192,

  knowledgeModules: [
    'RFP Response Builder Skill',
    'Company Profile',
    'Brand Standards',
    'Claim Governance',
  ],

  actions: {
    parseRfp: {
      label: 'Parse RFP Document',
      description: 'Extract structured questions from an RFP document',
      promptTemplate: (data) => `Parse the following RFP document text and extract all questions, requirements, and items that need a response.

Return ONLY a valid JSON array. Each element must have these fields:
- item_number (integer, sequential starting at 1)
- question_text (the full question or requirement text)
- section (the section/heading this falls under, or "General" if unclear)
- category (classify as one of: company_overview, safety, compliance, staffing, technical, financial, references, experience, transition, other)

RFP DOCUMENT TEXT:
${data.documentText}

Return ONLY the JSON array, no markdown fences, no explanation.`,
    },

    matchAnswers: {
      label: 'Match Q&A Library',
      description: 'Match RFP questions against the curated Q&A library',
      promptTemplate: (data) => `Match the following RFP questions against the Q&A library entries. For each question, find the best matching Q&A pair.

Return ONLY a valid JSON array. Each element must have:
- item_number (integer, matching the input question)
- matched_answer_id (string UUID of the best match from the library, or null if no good match)
- confidence (float 0-1, where 1 = exact match, 0.7+ = good match, 0.4-0.7 = partial, <0.4 = no match)
- suggested_response (string — the adapted response text using the matched answer, or a brief draft if no match)

RFP QUESTIONS:
${JSON.stringify(data.questions, null, 2)}

Q&A LIBRARY:
${JSON.stringify(data.qaLibrary, null, 2)}

Return ONLY the JSON array, no markdown fences, no explanation.`,
    },

    generateDraft: {
      label: 'Generate Draft Response',
      description: 'Generate a draft response for an individual RFP question',
      promptTemplate: (data) => `Draft a response for the following RFP question.

QUESTION: ${data.question}
SECTION: ${data.section || 'General'}
CATEGORY: ${data.category || 'other'}

${data.matchedAnswer ? `MATCHED Q&A LIBRARY ANSWER (use as foundation, adapt to context):
Q: ${data.matchedAnswer.question}
A: ${data.matchedAnswer.answer}
Confidence: ${data.matchedAnswer.confidence || 'N/A'}` : 'No matching Q&A library entry found. Draft from company knowledge base context.'}

${data.context ? `ADDITIONAL CONTEXT:\n${data.context}` : ''}

Write a clear, professional response that directly answers the question. Be specific and factual. Use the matched answer as your primary source if available, adapting the language to fit this specific RFP context.`,
    },
  },
};
