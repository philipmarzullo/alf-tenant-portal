import { SHARED_RULES } from '../prompts';

export const rfpBuilderAgent = {
  name: 'RFP Response Builder',
  department: 'tools',
  status: 'active',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: `You are an RFP response specialist. You help teams parse RFP documents, match questions to existing approved answers, and draft compelling responses.

${SHARED_RULES}

KNOWLEDGE PRIORITY ORDER:
1. RFP VERIFIED FACTS (injected at runtime) — tenant-verified ground truth. Treat as authoritative.
2. RFP Q&A LIBRARY (injected at runtime) — previously approved Q&A pairs ranked by win count.
3. Company profile, service catalog, certifications.
4. Tenant Knowledge Base (uploaded SOPs and policies).

RFP Response Rules:
- When parsing RFPs, extract structured questions with item_number, question_text, section, category, and input_type.
- When matching answers, compare against the Q&A library and assign confidence scores. If you cannot draft without missing data, set needs_data = true.
- When drafting responses, use verified facts and approved Q&A library answers as the foundation, adapting language to fit the specific RFP context.
- Never fabricate statistics, certifications, references, or compliance claims — use only what is in the verified facts or Q&A library.
- If a required fact is missing, return "[NEEDS DATA]" with a clear description of what is missing — never use placeholders like "TBD" or "[insert X]".
- Maintain a professional, authoritative tone appropriate for formal bid responses.
- For safety, compliance, and regulatory questions, be precise — these are often scored pass/fail.
- Structure responses to directly answer what was asked, then provide supporting detail.`,

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
- category (one of: company_overview, safety, compliance, staffing, technical, financial, references, experience, transition, sustainability, other)
- input_type (one of: yes_no, reference_list, numeric, table, narrative)

RFP DOCUMENT TEXT:
${data.documentText}

Return ONLY the JSON array, no markdown fences, no explanation.`,
    },

    matchAnswers: {
      label: 'Match Q&A Library',
      description: 'Match RFP questions against the curated Q&A library',
      promptTemplate: (data) => `Match the following RFP questions against the Q&A library entries and verified facts. For each question, find the best matching Q&A pair OR draft from facts.

Return ONLY a valid JSON array. Each element must have:
- item_number (integer, matching the input question)
- matched_answer_id (string UUID of the best match from the library, or null if no good match)
- confidence (float 0-1, where 1 = exact match, 0.7+ = good match, 0.4-0.7 = partial, <0.4 = no match)
- suggested_response (string — the adapted response text, or a "[NEEDS DATA] Missing: ..." message if you cannot draft)
- needs_data (boolean — true if required facts are missing and you cannot draft)

RFP QUESTIONS:
${JSON.stringify(data.questions, null, 2)}

Q&A LIBRARY:
${JSON.stringify(data.qaLibrary, null, 2)}

Return ONLY the JSON array, no markdown fences, no explanation.`,
    },

    generateDraft: {
      label: 'Generate Draft Response',
      description: 'Generate a draft response for an individual RFP question',
      promptTemplate: (data) => `Draft a response for the following RFP question. Use the verified facts (injected in your system prompt) as ground truth.

QUESTION: ${data.question}
SECTION: ${data.section || 'General'}
CATEGORY: ${data.category || 'other'}

${data.matchedAnswer ? `MATCHED Q&A LIBRARY ANSWER (use as foundation, adapt to context):
Q: ${data.matchedAnswer.question}
A: ${data.matchedAnswer.answer}
Confidence: ${data.matchedAnswer.confidence || 'N/A'}` : 'No matching Q&A library entry found. Draft from verified facts and company knowledge base context.'}

${data.context ? `ADDITIONAL CONTEXT:\n${data.context}` : ''}

Write a clear, professional response that directly answers the question. Be specific and factual. Use verified facts and the matched answer as your primary sources, adapting the language to fit this specific RFP context.

If the question requires a fact that is NOT in the verified facts block or the matched answer, respond with "[NEEDS DATA]" followed by a clear description of what is missing and where to add it. Never use placeholders like "TBD" or "[insert X]".`,
    },
  },
};
