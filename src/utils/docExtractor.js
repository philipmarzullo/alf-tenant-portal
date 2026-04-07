import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use Vite's ?url import to get a proper asset path for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ─────────────────────────────────────────────────────────────────────────────
// Legacy extractText API — used by QBU, Knowledge, SOP, Agent Chat, Admin pages
// Returns { text, type, pageCount?, warning? }
// ─────────────────────────────────────────────────────────────────────────────

export async function extractText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) return extractPdfText(file);
  if (name.endsWith('.docx') || name.endsWith('.doc')) return extractDocxText(file);
  if (name.endsWith('.txt')) return extractTxtText(file);
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return extractXlsxText(file);

  return { text: '', type: 'unknown', warning: `Unsupported file type: ${file.name}` };
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    pages.push(text);
  }

  return { text: pages.join('\n\n'), type: 'pdf', pageCount: pdf.numPages };
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return { text: result.value, type: 'docx' };
}

function extractTxtText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ text: reader.result, type: 'txt' });
    reader.onerror = () => resolve({ text: '', type: 'txt', warning: 'Failed to read text file' });
    reader.readAsText(file);
  });
}

async function extractXlsxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const parts = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    parts.push(`# ${sheetName}\n${csv}`);
  }
  return { text: parts.join('\n\n'), type: 'xlsx' };
}

// ─────────────────────────────────────────────────────────────────────────────
// RFP-specific normalized parser — used by RFP Response Builder
// Accepts a single File or array of Files. Returns:
// {
//   files: [{ name, type, sheet_names?, pricing_sheets?, questionnaire_sheet? }],
//   sections: [{ id, file_index, title, items: [...] }],
//   items:    [{ id, section_id, text, category, input_type, source_cell?, source_file? }],
//   warnings: [string]
// }
// Categories: company_overview, safety, compliance, staffing, technical,
//             financial, references, experience, transition, sustainability, other
// Input types: yes_no, reference_list, numeric, table, narrative
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  safety: ['safety', 'osha', 'incident', 'injury', 'trir', 'emr', 'recordable', 'hazard', 'msds', 'sds', 'ppe', 'lockout', 'tagout'],
  compliance: ['compliance', 'license', 'certification', 'insurance', 'bond', 'epa', 'regulat', 'permit', 'audit', 'iso', 'cimsÂ', 'cims', 'green seal'],
  staffing: ['staff', 'employee', 'fte', 'headcount', 'wage', 'pay rate', 'turnover', 'hiring', 'recruit', 'training', 'union', 'background check', 'drug test'],
  technical: ['equipment', 'machine', 'technology', 'software', 'system', 'process', 'method', 'procedure', 'specification'],
  financial: ['price', 'pricing', 'cost', 'fee', 'rate', 'budget', 'invoice', 'payment', 'financial', 'revenue', 'annual sales'],
  references: ['reference', 'client', 'customer', 'testimonial', 'case study', 'past performance', 'similar work'],
  experience: ['years', 'experience', 'history', 'established', 'founded', 'projects completed'],
  transition: ['transition', 'mobiliz', 'startup', 'onboard', 'implementation', 'transfer', 'cutover', 'kickoff'],
  sustainability: ['sustainab', 'green', 'leed', 'environment', 'recycle', 'carbon', 'energy', 'waste reduc', 'eco-friendly', 'biodegrad'],
  company_overview: ['company name', 'address', 'headquarters', 'duns', 'ein', 'legal name', 'company profile', 'about your company'],
};

const INPUT_TYPE_KEYWORDS = {
  yes_no: [
    /\byes\s*\/\s*no\b/i,
    /\bdo you\b/i,
    /\bhave you\b/i,
    /\bcan you\b/i,
    /\bwill you\b/i,
    /\bare you\b/i,
    /\bis your\b/i,
    /\bhas your\b/i,
  ],
  reference_list: [
    /\breference[s]?\b/i,
    /\bclient[s]?\b.*\b(list|provide|name|contact)\b/i,
    /\bsimilar (project|work|contract)/i,
    /\bpast performance\b/i,
  ],
  numeric: [
    /\bhow many\b/i,
    /\bnumber of\b/i,
    /\bcount of\b/i,
    /\bquantity\b/i,
    /\bpercentage\b/i,
    /\bratio\b/i,
    /\b(trir|emr|dart)\b/i,
  ],
  table: [
    /\bcomplete the table\b/i,
    /\bfill in the table\b/i,
    /\bschedule below\b/i,
    /\bmatrix\b/i,
  ],
};

function classifyInputType(text) {
  const t = text.toLowerCase();
  for (const [type, patterns] of Object.entries(INPUT_TYPE_KEYWORDS)) {
    for (const pat of patterns) {
      if (pat.test(t)) return type;
    }
  }
  return 'narrative';
}

function classifyCategory(text, sectionTitle = '') {
  const haystack = `${sectionTitle} ${text}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) return cat;
    }
  }
  return 'other';
}

function makeId(prefix, n) {
  return `${prefix}${n}`;
}

// ── PDF parsing with section detection ──────────────────────────────────────

async function parsePdfStructured(file, fileIndex) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Collect items with positional info to detect headings (bold/larger/all caps)
  const lines = []; // [{ text, fontSize, isBold, isAllCaps, hasNumberPrefix, blank_above }]

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by approximate Y position to reconstruct lines
    const items = content.items;
    const grouped = new Map(); // y → [items]
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y).push(it);
    }
    const sortedYs = [...grouped.keys()].sort((a, b) => b - a); // top to bottom
    let prevY = null;
    for (const y of sortedYs) {
      const lineItems = grouped.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = lineItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      if (!lineText) continue;

      const maxFont = Math.max(...lineItems.map(it => it.transform[0] || it.height || 0));
      const fontNames = lineItems.map(it => (it.fontName || '').toLowerCase());
      const isBold = fontNames.some(f => f.includes('bold') || f.includes('black') || f.includes('heavy'));
      const isAllCaps = lineText.length > 3 && lineText === lineText.toUpperCase() && /[A-Z]/.test(lineText);
      const hasNumberPrefix = /^(\d+(\.\d+)*\.?|[A-Z]\.|\([a-z]\)|[•\-\*])\s+/.test(lineText);
      const blankAbove = prevY !== null && (prevY - y) > maxFont * 1.8;

      lines.push({ text: lineText, fontSize: maxFont, isBold, isAllCaps, hasNumberPrefix, blankAbove });
      prevY = y;
    }
  }

  // Detect sections: a line is a section heading if it is bold/all-caps AND short AND followed by content
  const sections = [];
  const items = [];
  let currentSection = null;
  let currentItem = null;
  let sectionCounter = 0;
  let itemCounter = 0;

  const flushItem = () => {
    if (currentItem && currentItem.text.trim()) {
      currentItem.input_type = classifyInputType(currentItem.text);
      currentItem.category = classifyCategory(currentItem.text, currentSection?.title || '');
      items.push(currentItem);
      if (currentSection) currentSection.items.push(currentItem.id);
    }
    currentItem = null;
  };

  const startSection = (title) => {
    flushItem();
    sectionCounter += 1;
    currentSection = {
      id: makeId(`F${fileIndex + 1}-S`, sectionCounter),
      file_index: fileIndex,
      title: title.replace(/^\d+\.?\s*/, '').trim(),
      items: [],
    };
    sections.push(currentSection);
  };

  for (const ln of lines) {
    const isHeading = (ln.isBold || ln.isAllCaps) && ln.text.length < 80 && !/[?:]$/.test(ln.text);
    if (isHeading && (ln.blankAbove || lines.indexOf(ln) === 0)) {
      startSection(ln.text);
      continue;
    }

    // New item: starts with number prefix or after blank line
    if (ln.hasNumberPrefix || (ln.blankAbove && currentItem)) {
      flushItem();
      itemCounter += 1;
      currentItem = {
        id: makeId(`F${fileIndex + 1}-I`, itemCounter),
        section_id: currentSection?.id || null,
        text: ln.text.replace(/^(\d+(\.\d+)*\.?|[A-Z]\.|\([a-z]\)|[•\-\*])\s+/, ''),
        source_file: file.name,
      };
    } else if (currentItem) {
      currentItem.text += ' ' + ln.text;
    } else {
      // No item yet — start a narrative item
      itemCounter += 1;
      currentItem = {
        id: makeId(`F${fileIndex + 1}-I`, itemCounter),
        section_id: currentSection?.id || null,
        text: ln.text,
        source_file: file.name,
      };
    }
  }
  flushItem();

  return {
    file: { name: file.name, type: 'pdf', pageCount: pdf.numPages },
    sections,
    items,
    warnings: [],
  };
}

// ── DOCX parsing using mammoth as HTML for heading detection ────────────────

async function parseDocxStructured(file, fileIndex) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;

  const sections = [];
  const items = [];
  let currentSection = null;
  let currentItem = null;
  let sectionCounter = 0;
  let itemCounter = 0;

  const flushItem = () => {
    if (currentItem && currentItem.text.trim()) {
      currentItem.input_type = classifyInputType(currentItem.text);
      currentItem.category = classifyCategory(currentItem.text, currentSection?.title || '');
      items.push(currentItem);
      if (currentSection) currentSection.items.push(currentItem.id);
    }
    currentItem = null;
  };

  const startSection = (title) => {
    flushItem();
    sectionCounter += 1;
    currentSection = {
      id: makeId(`F${fileIndex + 1}-S`, sectionCounter),
      file_index: fileIndex,
      title: title.trim(),
      items: [],
    };
    sections.push(currentSection);
  };

  const newItem = (text) => {
    flushItem();
    itemCounter += 1;
    currentItem = {
      id: makeId(`F${fileIndex + 1}-I`, itemCounter),
      section_id: currentSection?.id || null,
      text: text.trim(),
      source_file: file.name,
    };
  };

  const visit = (node) => {
    if (!node) return;
    const tag = node.tagName?.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      startSection(node.textContent || '');
      return;
    }

    if (tag === 'p') {
      const text = node.textContent?.trim() || '';
      if (!text) return;
      // If first child is bold/strong, treat as new question label
      const firstStrong = node.querySelector('strong, b');
      const startsWithBold = firstStrong && node.firstChild === firstStrong;
      const numbered = /^(\d+(\.\d+)*\.?|[A-Z]\.|\([a-z]\))\s+/.test(text);

      if (startsWithBold || numbered) {
        newItem(text.replace(/^(\d+(\.\d+)*\.?|[A-Z]\.|\([a-z]\))\s+/, ''));
      } else if (currentItem) {
        currentItem.text += ' ' + text;
      } else {
        newItem(text);
      }
      return;
    }

    if (tag === 'li') {
      newItem(node.textContent?.trim() || '');
      return;
    }

    if (tag === 'table') {
      // Treat tables as structured items
      const rows = node.querySelectorAll('tr');
      if (rows.length) {
        const tableText = [...rows].map(r =>
          [...r.querySelectorAll('th, td')].map(c => c.textContent?.trim() || '').join(' | ')
        ).join('\n');
        flushItem();
        itemCounter += 1;
        const item = {
          id: makeId(`F${fileIndex + 1}-I`, itemCounter),
          section_id: currentSection?.id || null,
          text: tableText,
          input_type: 'table',
          category: classifyCategory(tableText, currentSection?.title || ''),
          source_file: file.name,
        };
        items.push(item);
        if (currentSection) currentSection.items.push(item.id);
      }
      return;
    }

    // Recurse into other containers
    for (const child of node.childNodes || []) visit(child);
  };

  for (const child of root.childNodes || []) visit(child);
  flushItem();

  return {
    file: { name: file.name, type: 'docx' },
    sections,
    items,
    warnings: result.messages?.length ? result.messages.map(m => m.message) : [],
  };
}

// ── TXT parsing — split on blank lines / numbered items ─────────────────────

async function parseTxtStructured(file, fileIndex) {
  const text = await file.text();
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  const sections = [];
  const items = [];
  let currentSection = null;
  let sectionCounter = 0;
  let itemCounter = 0;

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // First line could be a heading: short, all-caps, or ends with colon
    const first = lines[0];
    const isHeading = lines.length === 1 && (
      (first === first.toUpperCase() && first.length < 80) ||
      /:\s*$/.test(first)
    );

    if (isHeading) {
      sectionCounter += 1;
      currentSection = {
        id: makeId(`F${fileIndex + 1}-S`, sectionCounter),
        file_index: fileIndex,
        title: first.replace(/:\s*$/, '').trim(),
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Check if block starts with numbered/lettered item — treat each numbered line as an item
    const numberedSplit = block.split(/\n(?=(?:\d+\.|[A-Z]\.|\([a-z]\)|[•\-\*])\s+)/);
    for (const chunk of numberedSplit) {
      const cleaned = chunk.replace(/^(\d+(\.\d+)*\.?|[A-Z]\.|\([a-z]\)|[•\-\*])\s+/, '').trim();
      if (!cleaned) continue;
      itemCounter += 1;
      const item = {
        id: makeId(`F${fileIndex + 1}-I`, itemCounter),
        section_id: currentSection?.id || null,
        text: cleaned,
        source_file: file.name,
      };
      item.input_type = classifyInputType(item.text);
      item.category = classifyCategory(item.text, currentSection?.title || '');
      items.push(item);
      if (currentSection) currentSection.items.push(item.id);
    }
  }

  return {
    file: { name: file.name, type: 'txt' },
    sections,
    items,
    warnings: [],
  };
}

// ── Excel parsing — questionnaire vs pricing detection ──────────────────────

const PRICING_KEYWORDS = ['staffing', 'wage rate', 'hourly rate', 'pricing', 'cost per', 'monthly cost', 'annual cost', 'price per'];
const QUESTIONNAIRE_HEADERS = ['question', 'requirement', 'item', 'description'];
const RESPONSE_HEADERS = ['response', 'answer', 'reply', 'comments', 'vendor response', 'bidder response'];

function detectSheetType(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const headers = [];
  // Scan first 3 rows for headers
  for (let r = range.s.r; r <= Math.min(range.s.r + 2, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v != null) headers.push(String(cell.v).toLowerCase().trim());
    }
  }
  const headerStr = headers.join(' ');

  const hasQuestionCol = QUESTIONNAIRE_HEADERS.some(h => headers.includes(h));
  const hasResponseCol = RESPONSE_HEADERS.some(h => headers.includes(h));
  const hasPricing = PRICING_KEYWORDS.some(kw => headerStr.includes(kw));

  if (hasQuestionCol && hasResponseCol) return 'questionnaire';
  if (hasPricing) return 'pricing';
  if (hasQuestionCol) return 'questionnaire';
  return 'unknown';
}

function findColumns(ws, headerKeywords) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v != null) {
        const v = String(cell.v).toLowerCase().trim();
        if (headerKeywords.some(k => v === k || v.includes(k))) {
          return { headerRow: r, col: c };
        }
      }
    }
  }
  return null;
}

async function parseXlsxStructured(file, fileIndex) {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  const sections = [];
  const items = [];
  const sheetNames = [];
  const pricingSheets = [];
  let questionnaireSheet = null;
  let sectionCounter = 0;
  let itemCounter = 0;
  const warnings = [];

  for (const sheetName of wb.SheetNames) {
    sheetNames.push(sheetName);
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) continue;

    const sheetType = detectSheetType(ws);

    if (sheetType === 'pricing') {
      pricingSheets.push(sheetName);
      // Don't extract items from pricing sheets — they go to fill_excel mode
      continue;
    }

    if (sheetType === 'questionnaire') {
      if (!questionnaireSheet) questionnaireSheet = sheetName;

      const questionCol = findColumns(ws, QUESTIONNAIRE_HEADERS);
      const responseCol = findColumns(ws, RESPONSE_HEADERS);

      if (!questionCol) {
        warnings.push(`Sheet "${sheetName}": detected as questionnaire but no question column found`);
        continue;
      }

      // Create one section per sheet
      sectionCounter += 1;
      const section = {
        id: makeId(`F${fileIndex + 1}-S`, sectionCounter),
        file_index: fileIndex,
        title: sheetName,
        items: [],
      };
      sections.push(section);

      const range = XLSX.utils.decode_range(ws['!ref']);
      const startRow = questionCol.headerRow + 1;
      for (let r = startRow; r <= range.e.r; r++) {
        const qCell = ws[XLSX.utils.encode_cell({ r, c: questionCol.col })];
        const qText = qCell?.v ? String(qCell.v).trim() : '';
        if (!qText) continue;

        itemCounter += 1;
        const responseCellAddr = responseCol
          ? XLSX.utils.encode_cell({ r, c: responseCol.col })
          : null;

        const item = {
          id: makeId(`F${fileIndex + 1}-I`, itemCounter),
          section_id: section.id,
          text: qText,
          input_type: classifyInputType(qText),
          category: classifyCategory(qText, sheetName),
          source_file: file.name,
          source_cell: responseCellAddr ? `${sheetName}!${responseCellAddr}` : `${sheetName}!${XLSX.utils.encode_cell({ r, c: questionCol.col })}`,
        };
        items.push(item);
        section.items.push(item.id);
      }
      continue;
    }

    // Unknown sheet — fall back to row-based extraction (assume column A is the question)
    sectionCounter += 1;
    const section = {
      id: makeId(`F${fileIndex + 1}-S`, sectionCounter),
      file_index: fileIndex,
      title: sheetName,
      items: [],
    };
    sections.push(section);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: range.s.c })];
      const text = cell?.v ? String(cell.v).trim() : '';
      if (!text || text.length < 5) continue;

      itemCounter += 1;
      const item = {
        id: makeId(`F${fileIndex + 1}-I`, itemCounter),
        section_id: section.id,
        text,
        input_type: classifyInputType(text),
        category: classifyCategory(text, sheetName),
        source_file: file.name,
        source_cell: `${sheetName}!${XLSX.utils.encode_cell({ r, c: range.s.c })}`,
      };
      items.push(item);
      section.items.push(item.id);
    }
  }

  return {
    file: {
      name: file.name,
      type: 'xlsx',
      sheet_names: sheetNames,
      pricing_sheets: pricingSheets,
      questionnaire_sheet: questionnaireSheet,
    },
    sections,
    items,
    warnings,
  };
}

// ── Public API: parseRfpDocuments ───────────────────────────────────────────

export async function parseRfpDocuments(input) {
  const files = Array.isArray(input) ? input : [input];
  const results = {
    files: [],
    sections: [],
    items: [],
    warnings: [],
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.name.toLowerCase();
    let parsed;

    try {
      if (name.endsWith('.pdf')) {
        parsed = await parsePdfStructured(file, i);
      } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
        parsed = await parseDocxStructured(file, i);
      } else if (name.endsWith('.txt')) {
        parsed = await parseTxtStructured(file, i);
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        parsed = await parseXlsxStructured(file, i);
      } else {
        results.warnings.push(`Unsupported file type: ${file.name}`);
        continue;
      }
    } catch (err) {
      results.warnings.push(`Failed to parse ${file.name}: ${err.message}`);
      continue;
    }

    results.files.push(parsed.file);
    results.sections.push(...parsed.sections);
    results.items.push(...parsed.items);
    if (parsed.warnings?.length) results.warnings.push(...parsed.warnings);
  }

  return results;
}
