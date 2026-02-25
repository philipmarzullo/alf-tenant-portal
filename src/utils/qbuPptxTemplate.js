import PptxGenJS from 'pptxgenjs';

// ── Brand Constants ──────────────────────────────────────
const AA_BLUE = '009ADE';
const AA_RED = 'E12F2C';
const DARK = '272727';
const MED_GREY = '5A5D62';
const NEAR_BLACK = '1B2133';
const WHITE = 'FFFFFF';
const LIGHT_BG = 'F2F2F2';
const CARD_BG = WHITE;
const CALLOUT_BG = 'E8F4FD';
const GREEN = '43A047';
const AMBER = 'F0A030';
const FONT = 'Roboto';

// Circle overlay color for cover/thank-you slides
const CIRCLE_BLUE = '1E3A5F';
const CIRCLE_BLUE_LIGHT = '2A5080';

// ── Layout Constants (16:9 = 10" × 5.625") ──────────────
const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.6;
const CONTENT_W = SLIDE_W - MARGIN * 2;

// Card dimensions for 2-column and 3-column layouts
const COL2_W = (CONTENT_W - 0.3) / 2;
const COL3_W = (CONTENT_W - 0.6) / 3;

// ── Helpers ──────────────────────────────────────────────

async function fetchLogoBase64(path) {
  try {
    const resp = await fetch(path);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ── Slide Design System ──────────────────────────────────

/** Light gray background for all content slides */
function setContentBackground(slide) {
  slide.background = { fill: LIGHT_BG };
}

/** Section title: large A&A Blue text + red accent underline */
function addSectionTitle(slide, title) {
  slide.addText(title, {
    x: MARGIN, y: 0.25, w: CONTENT_W, h: 0.6,
    fontSize: 26, fontFace: FONT, color: AA_BLUE, bold: false,
  });
  // Red accent underline
  slide.addShape('rect', {
    x: MARGIN, y: 0.9, w: 1.5, h: 0.045,
    fill: { color: AA_RED },
  });
}

/** Logo in bottom-right corner — actual ratio is 2.83:1 */
function addLogoBottomRight(slide, logoColor) {
  if (logoColor) {
    slide.addImage({ data: logoColor, x: 8.85, y: 5.15, w: 0.65, h: 0.23 });
  }
}

/** White card with optional colored top border */
function addCard(slide, { x, y, w, h, borderColor, borderSide = 'top' }) {
  // Card shadow effect (subtle)
  slide.addShape('rect', {
    x: x + 0.02, y: y + 0.02, w, h,
    fill: { color: 'E0E0E0' }, rectRadius: 0.03,
  });
  // White card
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: CARD_BG }, rectRadius: 0.03,
  });
  // Colored accent border
  if (borderColor) {
    if (borderSide === 'top') {
      slide.addShape('rect', {
        x: x + 0.03, y, w: w - 0.06, h: 0.05,
        fill: { color: borderColor },
      });
    } else if (borderSide === 'left') {
      slide.addShape('rect', {
        x, y: y + 0.03, w: 0.05, h: h - 0.06,
        fill: { color: borderColor },
      });
    }
  }
}

/** Light blue callout box for Key Takeaway sections */
function addCalloutBox(slide, { x, y, w, h, label, text }) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: CALLOUT_BG }, rectRadius: 0.05,
  });
  const parts = [];
  if (label) {
    parts.push({ text: label, options: { bold: true, fontSize: 10, color: DARK } });
  }
  if (text) {
    parts.push({ text: (label ? ' ' : '') + text, options: { bold: false, fontSize: 10, color: DARK } });
  }
  slide.addText(parts, {
    x: x + 0.2, y: y + 0.1, w: w - 0.4, h: h - 0.2,
    fontFace: FONT, valign: 'middle', lineSpacingMultiple: 1.3,
  });
}

/** Branded table matching reference deck style */
function addBrandedTable(slide, rows, opts = {}) {
  const headerRow = rows[0] || [];
  const tableRows = rows.map((row, ri) =>
    row.map((cell, ci) => ({
      text: String(cell ?? ''),
      options: ri === 0
        ? {
            fill: { color: AA_BLUE },
            color: WHITE,
            bold: true,
            fontSize: 9,
            fontFace: FONT,
            align: ci === 0 ? 'left' : 'center',
            valign: 'middle',
          }
        : {
            fontSize: 9,
            fontFace: FONT,
            color: typeof cell === 'object' && cell?.color ? cell.color : DARK,
            bold: typeof cell === 'object' && cell?.bold ? true : (ri === rows.length - 1 && row[0] === 'TOTAL'),
            fill: { color: ri % 2 === 0 ? LIGHT_BG : WHITE },
            align: ci === 0 ? 'left' : 'center',
            valign: 'middle',
          },
    }))
  );

  slide.addTable(tableRows, {
    x: opts.x ?? MARGIN, y: opts.y ?? 1.2, w: opts.w ?? CONTENT_W,
    border: { type: 'solid', pt: 0.5, color: 'E0E0E0' },
    rowH: opts.rowH ?? 0.35,
    autoPage: false,
    ...opts,
  });
}

/** Bullet list inside a card */
function addCardBullets(slide, items, { x, y, w, h }) {
  const filtered = (items || []).filter(Boolean);
  if (!filtered.length) return;
  slide.addText(
    filtered.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
    {
      x: x + 0.25, y, w: w - 0.5, h,
      fontSize: 10, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
      valign: 'top',
    }
  );
}

/** Calculate adaptive card height based on content */
function calcCardH(itemCount, { minH = 1.2, maxH = 4.2, headerH = 0.5, itemH = 0.35, padH = 0.3 } = {}) {
  const contentH = headerH + itemCount * itemH + padH;
  return Math.max(minH, Math.min(maxH, contentH));
}

/** Estimate bullet text height — longer bullets wrap and need more space */
function estimateBulletH(items, colW = 4.0) {
  let total = 0;
  for (const item of (items || [])) {
    const chars = (item || '').length;
    const charsPerLine = Math.floor(colW * 12); // ~12 chars per inch at 10pt
    const lines = Math.max(1, Math.ceil(chars / charsPerLine));
    total += lines * 0.22 + 0.06; // line height + spacing
  }
  return total;
}

/** Format a value as currency if it's a number */
function fmtCurrency(val) {
  if (!val) return '$0';
  const str = String(val).replace(/[$,]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return val;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Check if a section has meaningful data (not just empty defaults) */
function hasData(items) {
  if (!items || !items.length) return false;
  return items.some((item) => {
    if (typeof item === 'string') return item.length > 0;
    return Object.values(item).some((v) => v && String(v).length > 0);
  });
}

// ── Agent Narrative Parser ───────────────────────────────

/**
 * Parse structured narrative blocks from agent output.
 * Blocks use the format:
 *   <!-- NARRATIVE:SECTION:KEY -->
 *   content
 *   <!-- /NARRATIVE -->
 *
 * Returns an object like:
 *   { 'B1:ACHIEVEMENTS': ['line1', 'line2'], 'C1:TAKEAWAY': 'text', ... }
 */
function parseAgentNarratives(agentOutput) {
  if (!agentOutput || typeof agentOutput !== 'string') return {};

  const narratives = {};
  const regex = /<!-- NARRATIVE:(\S+?) -->\s*\n([\s\S]*?)<!-- \/NARRATIVE -->/g;
  let match;

  while ((match = regex.exec(agentOutput)) !== null) {
    const key = match[1].trim();
    const content = match[2].trim();
    // For multi-line blocks, split into array of non-empty lines
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    narratives[key] = lines.length === 1 ? lines[0] : lines;
  }

  return narratives;
}

/** Get a narrative as an array (always returns array) */
function getNarrativeLines(narratives, key) {
  const val = narratives[key];
  if (!val) return null;
  return Array.isArray(val) ? val : [val];
}

/** Get a narrative as a single string */
function getNarrativeText(narratives, key) {
  const val = narratives[key];
  if (!val) return null;
  return Array.isArray(val) ? val.join('\n') : val;
}

// ── Cover Slide ──────────────────────────────────────────

function addCoverSlide(pptx, form, logoWhite) {
  const slide = pptx.addSlide();
  slide.background = { fill: NEAR_BLACK };

  // Decorative circles (right side) — layered effect
  slide.addShape('ellipse', {
    x: 6.5, y: -1.5, w: 5.5, h: 5.5,
    fill: { color: CIRCLE_BLUE, transparency: 60 },
  });
  slide.addShape('ellipse', {
    x: 7.0, y: -1.0, w: 4.5, h: 4.5,
    fill: { color: CIRCLE_BLUE_LIGHT, transparency: 50 },
  });

  // Red diamond accent
  slide.addShape('diamond', {
    x: 5.6, y: 0.3, w: 0.18, h: 0.18,
    fill: { color: AA_RED },
  });

  // Client name in A&A Blue
  slide.addText(form.cover.clientName || 'Client Name', {
    x: MARGIN, y: 1.8, w: 7.0, h: 0.9,
    fontSize: 36, fontFace: FONT, color: AA_BLUE, bold: false,
  });

  // "Quarterly Business Update |Q#| Date:"
  const qLine = `Quarterly Business Update  |${form.cover.quarter || 'Q#'}|  ${form.cover.date || ''}`;
  slide.addText(qLine, {
    x: MARGIN, y: 2.75, w: 7.0, h: 0.4,
    fontSize: 14, fontFace: FONT, color: MED_GREY,
  });

  // Red accent line
  slide.addShape('rect', {
    x: MARGIN, y: 3.25, w: 1.8, h: 0.04,
    fill: { color: AA_RED },
  });

  // Logo bottom-left — actual ratio is 2.83:1
  if (logoWhite) {
    slide.addImage({ data: logoWhite, x: MARGIN, y: 4.7, w: 1.1, h: 0.39 });
  }

  // aaefs.com bottom-right
  slide.addText('aaefs.com', {
    x: 8.0, y: 5.1, w: 1.5, h: 0.3,
    fontSize: 10, fontFace: FONT, color: MED_GREY, align: 'right',
  });
}

// ── Slide 2: Introductions ──────────────────────────────

function addIntroductionsSlide(pptx, form, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Introductions');

  const aaTeam = (form.cover.aaTeam || []).filter((r) => r.name);
  const clientTeam = (form.cover.clientTeam || []).filter((r) => r.name);
  const clientName = form.cover.clientName || 'CLIENT';

  const cardY = 1.15;
  const maxItems = Math.max(aaTeam.length, clientTeam.length, 1);
  const cardH = calcCardH(maxItems, { headerH: 0.55, itemH: 0.32, maxH: 4.1 });
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;

  // A&A Team card
  addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH });
  // Blue header bar
  slide.addShape('rect', {
    x: x1, y: cardY, w: COL2_W, h: 0.4,
    fill: { color: AA_BLUE }, rectRadius: 0.03,
  });
  // Fix bottom corners of header to be square
  slide.addShape('rect', {
    x: x1, y: cardY + 0.2, w: COL2_W, h: 0.2,
    fill: { color: AA_BLUE },
  });
  slide.addText('A&A TEAM', {
    x: x1, y: cardY, w: COL2_W, h: 0.4,
    fontSize: 11, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
  });
  if (aaTeam.length) {
    const items = aaTeam.map((r) => r.title ? `${r.name} \u2014 ${r.title}` : r.name);
    addCardBullets(slide, items, { x: x1, y: cardY + 0.55, w: COL2_W, h: cardH - 0.7 });
  }

  // Client Team card
  addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH });
  // Dark header bar
  slide.addShape('rect', {
    x: x2, y: cardY, w: COL2_W, h: 0.4,
    fill: { color: NEAR_BLACK }, rectRadius: 0.03,
  });
  slide.addShape('rect', {
    x: x2, y: cardY + 0.2, w: COL2_W, h: 0.2,
    fill: { color: NEAR_BLACK },
  });
  slide.addText(clientName.toUpperCase(), {
    x: x2, y: cardY, w: COL2_W, h: 0.4,
    fontSize: 11, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
  });
  if (clientTeam.length) {
    const items = clientTeam.map((r) => r.title ? `${r.name} \u2014 ${r.title}` : r.name);
    addCardBullets(slide, items, { x: x2, y: cardY + 0.55, w: COL2_W, h: cardH - 0.7 });
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 3: A.1 Safety Moment ──────────────────────────

function addSafetyMomentSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);

  const s = form.safety;
  const theme = s.theme || 'Safety Awareness';
  addSectionTitle(slide, `Safety Moment \u2014 ${theme}`);

  const cardY = 1.15;
  const tips = getNarrativeLines(narratives, 'A1:TIPS') || (s.keyTips ? s.keyTips.split('\n').filter(Boolean) : []);
  const reminders = getNarrativeLines(narratives, 'A1:REMINDERS') || (s.quickReminders ? s.quickReminders.split('\n').filter(Boolean) : []);
  const maxBullets = Math.max(tips.length, reminders.length, 1);
  const whyItMatters = getNarrativeText(narratives, 'A1:WHYITMATTERS') || s.whyItMatters;
  const hasWhyItMatters = !!whyItMatters;
  const maxCardBottom = hasWhyItMatters ? 4.05 : 4.85;
  const cardH = Math.min(calcCardH(maxBullets, { headerH: 0.55, itemH: 0.4 }), maxCardBottom - cardY);
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;

  // Key Safety Tips card (blue left border)
  addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });
  slide.addShape('rect', { x: x1 + 0.05, y: cardY, w: 0.4, h: 0.04, fill: { color: AA_RED } });
  slide.addText('KEY SAFETY TIPS', {
    x: x1 + 0.2, y: cardY + 0.15, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  if (tips.length) {
    addCardBullets(slide, tips, { x: x1, y: cardY + 0.5, w: COL2_W, h: cardH - 0.7 });
  }

  // Quick Reminders card (red left border)
  addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH, borderColor: AA_RED, borderSide: 'left' });
  slide.addText('QUICK REMINDERS', {
    x: x2 + 0.2, y: cardY + 0.15, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  if (reminders.length) {
    addCardBullets(slide, reminders, { x: x2, y: cardY + 0.5, w: COL2_W, h: cardH - 0.7 });
  }

  // Why It Matters callout box at bottom
  if (hasWhyItMatters) {
    const callY = cardY + cardH + 0.2;
    addCalloutBox(slide, {
      x: MARGIN, y: callY, w: CONTENT_W, h: 0.85,
      label: 'Why It Matters:', text: whyItMatters,
    });
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 4: A.2 Safety & Compliance Review ─────────────

function addSafetyComplianceSlide(pptx, form, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Safety & Compliance Review');

  const incidents = (form.safety.incidents || []).filter((r) => r.location);

  if (incidents.length) {
    // Build rows with Annual totals column and TOTAL row
    const headerRow = ['Location', 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
    const dataRows = incidents.map((r) => {
      const vals = [Number(r.q1) || 0, Number(r.q2) || 0, Number(r.q3) || 0, Number(r.q4) || 0];
      return [r.location, ...vals.map(String), String(vals.reduce((a, b) => a + b, 0))];
    });
    // Total row
    const totals = [0, 0, 0, 0, 0];
    dataRows.forEach((row) => {
      for (let i = 1; i <= 5; i++) totals[i - 1] += Number(row[i]) || 0;
    });
    dataRows.push(['TOTAL', ...totals.map(String)]);

    addBrandedTable(slide, [headerRow, ...dataRows], { y: 1.15, w: CONTENT_W });
  }

  // Good Saves and Recordable Details cards below the table
  const saves = (form.safety.goodSaves || []).filter((r) => r.location || r.hazard);
  const details = (form.safety.incidentDetails || []).filter((r) => r.location);
  const cardY = 1.15 + ((incidents.length + 2) * 0.35) + 0.25;
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;
  const remainingH = SLIDE_H - cardY - 0.45;

  if ((saves.length || details.length) && remainingH > 0.8) {
    const saveBulletH = estimateBulletH(
      saves.map((r) => `${r.location}: ${r.hazard}. ${r.action}. Notified: ${r.notified}.`),
      COL2_W - 0.5
    );
    const detailBulletH = estimateBulletH(
      details.map((r) => `${r.location} | ${r.date}: ${r.cause}. Treatment: ${r.treatment}. RTW: ${r.returnDate}.`),
      COL2_W - 0.5
    );
    const cardH = Math.min(Math.max(saveBulletH, detailBulletH) + 0.6, remainingH);
    const fontSize = cardH < 1.5 ? 8 : 9;

    // Good Saves card (green left border)
    addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH, borderColor: GREEN, borderSide: 'left' });
    slide.addText('GOOD SAVES', {
      x: x1 + 0.2, y: cardY + 0.1, w: COL2_W - 0.4, h: 0.3,
      fontSize: 11, fontFace: FONT, color: DARK, bold: true,
    });
    if (saves.length) {
      const items = saves.map((r) =>
        `${r.location}: ${r.hazard}. ${r.action}. Notified: ${r.notified}.`
      );
      addCardBullets(slide, items, { x: x1, y: cardY + 0.45, w: COL2_W, h: cardH - 0.6 });
    }

    // Recordable Details card (amber left border)
    addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH, borderColor: AMBER, borderSide: 'left' });
    slide.addText('RECORDABLE DETAILS', {
      x: x2 + 0.2, y: cardY + 0.1, w: COL2_W - 0.4, h: 0.3,
      fontSize: 11, fontFace: FONT, color: DARK, bold: true,
    });
    if (details.length) {
      const items = details.map((r) =>
        `${r.location} | ${r.date}: ${r.cause}. Treatment: ${r.treatment}. RTW: ${r.returnDate}.`
      );
      slide.addText(items.join('\n\n'), {
        x: x2 + 0.2, y: cardY + 0.45, w: COL2_W - 0.4, h: cardH - 0.6,
        fontSize: fontSize, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
      });
    }
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 5: B.1 Executive Summary ──────────────────────

function addExecutiveSummarySlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Executive Summary');

  const e = form.executive;
  const cardY = 1.15;
  const gap = 0.3;
  const maxCardH = SLIDE_H - cardY - 0.25;

  const cols = [
    { title: 'KEY ACHIEVEMENTS', items: getNarrativeLines(narratives, 'B1:ACHIEVEMENTS') || (e.achievements || []).filter(Boolean), color: AA_BLUE },
    { title: 'STRATEGIC CHALLENGES', items: getNarrativeLines(narratives, 'B1:CHALLENGES') || (e.challenges || []).filter(Boolean), color: AMBER },
    { title: 'INNOVATION MILESTONES', items: getNarrativeLines(narratives, 'B1:INNOVATIONS') || (e.innovations || []).filter(Boolean), color: GREEN },
  ];

  // Use the tallest column's content to set card height
  const maxBulletH = Math.max(...cols.map((c) => estimateBulletH(c.items, COL3_W - 0.5)));
  const cardH = Math.min(maxBulletH + 0.8, maxCardH);
  // Shrink font if content is heavy — floor at 7pt for dense content
  const bulletFontSize = maxBulletH > 3.5 ? 7 : 10;

  cols.forEach((col, i) => {
    const x = MARGIN + i * (COL3_W + gap);
    addCard(slide, { x, y: cardY, w: COL3_W, h: cardH, borderColor: col.color, borderSide: 'top' });
    slide.addText(col.title, {
      x: x + 0.15, y: cardY + 0.15, w: COL3_W - 0.3, h: 0.3,
      fontSize: 10, fontFace: FONT, color: DARK, bold: true,
    });
    if (col.items.length) {
      slide.addText(
        col.items.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
        {
          x: x + 0.25, y: cardY + 0.6, w: COL3_W - 0.5, h: cardH - 0.8,
          fontSize: bulletFontSize, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
          valign: 'top',
        }
      );
    }
  });

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 6: C.1 Operational Performance — Work Tickets ─

function addWorkTicketsSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Operational Performance \u2014 Work Tickets');

  const locs = (form.workTickets.locations || []).filter((r) => r.location);
  if (locs.length) {
    const q = form.cover.quarter || '';
    // Extract quarter and year: "Q3 2025" → prior = "Q3 2024"
    const yearMatch = q.match(/\d{4}/);
    const priorLabel = yearMatch
      ? q.replace(yearMatch[0], String(Number(yearMatch[0]) - 1))
      : q ? `${q} (Prior Year)` : 'Prior Year';
    const currentLabel = q || 'Current Year';

    const headerRow = ['Location', priorLabel, currentLabel, 'Change'];
    const dataRows = locs.map((r) => {
      const prior = Number(r.priorYear) || 0;
      const current = Number(r.currentYear) || 0;
      const pct = prior ? (((current - prior) / prior) * 100).toFixed(1) + '%' : '\u2014';
      return [r.location, String(r.priorYear || 0), String(r.currentYear || 0), pct];
    });
    // Total row
    const totalPrior = locs.reduce((s, r) => s + (Number(r.priorYear) || 0), 0);
    const totalCurrent = locs.reduce((s, r) => s + (Number(r.currentYear) || 0), 0);
    const totalPct = totalPrior ? (((totalCurrent - totalPrior) / totalPrior) * 100).toFixed(1) + '%' : '\u2014';
    dataRows.push(['TOTAL', String(totalPrior), String(totalCurrent), totalPct]);

    addBrandedTable(slide, [headerRow, ...dataRows], { y: 1.15 });
  }

  // Key Takeaway callout — prefer agent narrative over raw form data
  const takeawayText = getNarrativeText(narratives, 'C1:TAKEAWAY') || form.workTickets.keyTakeaway;
  const tableBottom = 1.15 + ((locs.length + 2) * 0.35) + 0.3;
  if (takeawayText) {
    addCalloutBox(slide, {
      x: MARGIN, y: tableBottom, w: CONTENT_W, h: 0.85,
      label: 'Key Takeaway:', text: takeawayText,
    });
  }

  // Events Supported callout
  if (form.workTickets.eventsSupported) {
    const evY = takeawayText ? tableBottom + 1.0 : tableBottom;
    addCalloutBox(slide, {
      x: MARGIN, y: evY, w: CONTENT_W, h: 0.85,
      label: 'Events Supported:', text: form.workTickets.eventsSupported,
    });
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 7: C.2 Audits and Corrective Actions ─────────

function addAuditsSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Audits and Corrective Actions');

  const a = form.audits;
  // Only include columns that have a location name
  const activeIndices = (a.locationNames || []).map((n, i) => n ? i : -1).filter((i) => i >= 0);
  const names = activeIndices.map((i) => a.locationNames[i]);

  if (names.length) {
    const sumActive = (arr) => String(activeIndices.reduce((s, i) => s + (Number(arr[i]) || 0), 0));
    const headerRow = ['', ...names, 'Total'];
    const rows = [
      headerRow,
      ['Prior Qtr Audits', ...activeIndices.map((i) => String(a.priorAudits[i] || '')), sumActive(a.priorAudits)],
      ['Prior Qtr Actions', ...activeIndices.map((i) => String(a.priorActions[i] || '')), sumActive(a.priorActions)],
      ['Current Qtr Audits', ...activeIndices.map((i) => String(a.currentAudits[i] || '')), sumActive(a.currentAudits)],
      ['Current Qtr Actions', ...activeIndices.map((i) => String(a.currentActions[i] || '')), sumActive(a.currentActions)],
    ];
    addBrandedTable(slide, rows, { y: 1.15 });
  }

  // Audit & Action Analysis card below table — prefer agent narrative
  const agentAnalysis = getNarrativeText(narratives, 'C2:ANALYSIS');
  const cardY = 1.15 + 6 * 0.35 + 0.3;

  if (agentAnalysis || a.auditExplanation || a.actionExplanation) {
    addCard(slide, { x: MARGIN, y: cardY, w: CONTENT_W, h: SLIDE_H - cardY - 0.35, borderColor: AA_BLUE, borderSide: 'left' });
    slide.addText('AUDIT & ACTION ANALYSIS', {
      x: MARGIN + 0.2, y: cardY + 0.1, w: CONTENT_W - 0.4, h: 0.25,
      fontSize: 11, fontFace: FONT, color: DARK, bold: true,
    });

    if (agentAnalysis) {
      // Use the agent's polished narrative
      slide.addText(agentAnalysis, {
        x: MARGIN + 0.2, y: cardY + 0.4, w: CONTENT_W - 0.4, h: SLIDE_H - cardY - 0.9,
        fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
      });
    } else {
      // Fallback to raw form data
      let textY = cardY + 0.4;
      if (a.auditExplanation) {
        slide.addText(a.auditExplanation, {
          x: MARGIN + 0.2, y: textY, w: CONTENT_W - 0.4, h: 0.8,
          fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
        });
        textY += 0.85;
      }
      if (a.actionExplanation) {
        slide.addText(a.actionExplanation, {
          x: MARGIN + 0.2, y: textY, w: CONTENT_W - 0.4, h: 0.8,
          fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
        });
      }
    }
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 8: C.3 Top Action Areas (Charts) ──────────────

function addTopAreasSlide(pptx, form, logoColor, narratives) {
  const areas = (form.audits.topAreas || []).filter((a) => a.count);
  if (!areas.length) return; // Skip slide entirely when no data

  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Top Action Areas');

  const chartColors = [AA_BLUE, '0077B6', '48CAE4', NEAR_BLACK, AA_RED, MED_GREY];
  const total = areas.reduce((s, a) => s + (Number(a.count) || 0), 0);
  const q = form.cover.quarter || 'Current';

  // Left side: Bar chart
  addCard(slide, { x: MARGIN, y: 1.15, w: COL2_W, h: 3.7 });
  slide.addText(`${q} Corrective Actions by Area`, {
    x: MARGIN + 0.15, y: 1.25, w: COL2_W - 0.3, h: 0.3,
    fontSize: 10, fontFace: FONT, color: DARK, bold: true, align: 'center',
  });

  slide.addChart(pptx.charts.BAR, [
    {
      name: 'Actions',
      labels: areas.map((a) => a.area),
      values: areas.map((a) => Number(a.count) || 0),
    },
  ], {
    x: MARGIN + 0.15, y: 1.6, w: COL2_W - 0.3, h: 3.0,
    barDir: 'col',
    showValue: true,
    valueFontSize: 8,
    valueFontColor: AA_BLUE,
    catAxisLabelFontSize: 7,
    catAxisLabelRotate: 315,
    valAxisHidden: false,
    valAxisLabelFontSize: 7,
    chartColors: [AA_BLUE],
    showLegend: false,
    barGapWidthPct: 80,
  });

  // Right side: Pie chart
  addCard(slide, { x: MARGIN + COL2_W + 0.3, y: 1.15, w: COL2_W, h: 3.7 });
  slide.addText('Action Area Distribution', {
    x: MARGIN + COL2_W + 0.45, y: 1.25, w: COL2_W - 0.3, h: 0.3,
    fontSize: 10, fontFace: FONT, color: DARK, bold: true, align: 'center',
  });

  slide.addChart(pptx.charts.PIE, [
    {
      name: 'Distribution',
      labels: areas.map((a) => a.area),
      values: areas.map((a) => Number(a.count) || 0),
    },
  ], {
    x: MARGIN + COL2_W + 0.45, y: 1.55, w: COL2_W - 0.5, h: 2.6,
    showPercent: true,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    dataLabelFontSize: 8,
    chartColors: chartColors.slice(0, areas.length),
  });

  // Key Takeaway callout at bottom — prefer agent narrative over auto-generated
  const takeawayText = getNarrativeText(narratives, 'C3:TAKEAWAY')
    || (total > 0
      ? `${areas[0].area} accounts for ${((Number(areas[0].count) / total) * 100).toFixed(0)}% of corrective actions this quarter.`
      : '');
  addCalloutBox(slide, {
    x: MARGIN, y: 5.0, w: CONTENT_W, h: 0.5,
    label: 'Key Takeaway:',
    text: takeawayText,
  });

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 9: D.1 Completed Projects Showcase ────────────

function addCompletedProjectsSlide(pptx, form, logoColor, narratives) {
  const projects = (form.projects.completed || []).filter((p) => p.description);
  if (!projects.length) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, 'Completed Projects Showcase');
    slide.addText('No completed projects reported this quarter.', {
      x: MARGIN, y: 2.5, w: CONTENT_W, h: 0.5,
      fontSize: 12, fontFace: FONT, color: MED_GREY, italic: true, align: 'center',
    });
    addLogoBottomRight(slide, logoColor);
    return;
  }

  // Group projects by category — prefer agent narrative over raw form data
  const categories = {};
  const narrativeLines = getNarrativeLines(narratives, 'D1:PROJECTS');
  if (narrativeLines) {
    narrativeLines.forEach((line) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        const cat = parts[0] || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(parts[1]);
      } else {
        if (!categories['General']) categories['General'] = [];
        categories['General'].push(line);
      }
    });
  } else {
    projects.forEach((p) => {
      const cat = p.category || 'General';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(p.description);
    });
  }

  // Render in batches of 3 categories per slide
  const allCatKeys = Object.keys(categories);
  for (let batch = 0; batch < allCatKeys.length; batch += 3) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, batch === 0
      ? 'Completed Projects Showcase'
      : 'Completed Projects Showcase (cont.)');

    const catKeys = allCatKeys.slice(batch, batch + 3);
    const numCols = catKeys.length;
    const cardY = 1.15;
    const gap = 0.3;
    const colW = numCols === 1 ? CONTENT_W : numCols === 2 ? COL2_W : COL3_W;
    const colGap = numCols === 2 ? 0.3 : gap;
    const maxCardH = SLIDE_H - cardY - 0.45;

    const maxBulletH = Math.max(...catKeys.map((k) => estimateBulletH(categories[k], colW - 0.5)));
    const cardH = Math.min(maxBulletH + 0.8, maxCardH);
    const bulletFontSize = maxBulletH > 3.5 ? 8 : 10;

    catKeys.forEach((cat, i) => {
      const x = MARGIN + i * (colW + colGap);
      addCard(slide, { x, y: cardY, w: colW, h: cardH, borderColor: AA_BLUE, borderSide: 'top' });
      slide.addText(cat.toUpperCase(), {
        x: x + 0.15, y: cardY + 0.15, w: colW - 0.3, h: 0.3,
        fontSize: 10, fontFace: FONT, color: DARK, bold: true,
      });
      slide.addText(
        categories[cat].map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
        {
          x: x + 0.25, y: cardY + 0.6, w: colW - 0.5, h: cardH - 0.8,
          fontSize: bulletFontSize, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
          valign: 'top',
        }
      );
    });

    addLogoBottomRight(slide, logoColor);
  }
}

// ── Slide 10: D.2 Project Photos ────────────────────────

async function addPhotoSlides(pptx, form, logoColor) {
  const photos = form.projects?.photos || [];
  const withFiles = photos.filter((p) => p.file instanceof File);
  if (!withFiles.length) return; // Skip photo slides entirely when no photos

  // 2 photos per slide in rounded-corner white card frames
  for (let i = 0; i < withFiles.length; i += 2) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, 'Completed Projects \u2014 Photos');

    for (let j = 0; j < 2 && i + j < withFiles.length; j++) {
      const photo = withFiles[i + j];
      const base64 = await fileToBase64(photo.file);
      const xPos = j === 0 ? MARGIN : MARGIN + COL2_W + 0.3;

      // Card frame
      addCard(slide, { x: xPos, y: 1.15, w: COL2_W, h: 3.8 });
      slide.addImage({
        data: base64, x: xPos + 0.15, y: 1.3, w: COL2_W - 0.3, h: 3.0,
        rounding: true,
      });

      const caption = [photo.caption, photo.location].filter(Boolean).join(' \u2014 ') || photo.name;
      slide.addText(caption, {
        x: xPos + 0.15, y: 4.4, w: COL2_W - 0.3, h: 0.4,
        fontSize: 9, fontFace: FONT, color: MED_GREY, align: 'center', italic: true,
      });
    }

    addLogoBottomRight(slide, logoColor);
  }
}

// ── Slide 11: D.3 Service & Client Satisfaction ─────────

function addTestimonialsSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Service & Client Satisfaction');

  // Build testimonials list — prefer agent narrative for organization, but quotes stay exact
  const narrativeLines = getNarrativeLines(narratives, 'D3:TESTIMONIALS');
  let testimonials;
  if (narrativeLines) {
    // Parse "location | quote | attribution" lines from agent
    testimonials = narrativeLines.map((line) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        return { location: parts[0], quote: parts[1], attribution: parts[2] };
      } else if (parts.length === 2) {
        return { quote: parts[0], attribution: parts[1], location: '' };
      }
      return { quote: line, attribution: '', location: '' };
    }).filter((t) => t.quote);
  } else {
    testimonials = (form.projects.testimonials || []).filter((t) => t.quote);
  }

  if (!testimonials.length) {
    slide.addText('No testimonials reported this quarter.', {
      x: MARGIN, y: 2.5, w: CONTENT_W, h: 0.5,
      fontSize: 12, fontFace: FONT, color: MED_GREY, italic: true, align: 'center',
    });
    addLogoBottomRight(slide, logoColor);
    return;
  }

  // Calculate adaptive heights per testimonial based on content length
  const maxShow = Math.min(testimonials.length, 3);
  const availableH = SLIDE_H - 1.15 - 0.45;
  const totalGap = (maxShow - 1) * 0.15;

  // Estimate each testimonial's needed height
  const quoteHeights = testimonials.slice(0, maxShow).map((t) => {
    const chars = (t.quote || '').length;
    const charsPerLine = Math.floor((CONTENT_W - 0.6) * 11);
    const lines = Math.max(1, Math.ceil(chars / charsPerLine));
    const locH = t.location ? 0.25 : 0;
    const attrH = t.attribution ? 0.3 : 0;
    return locH + lines * 0.18 + attrH + 0.25;
  });
  const totalNeeded = quoteHeights.reduce((s, h) => s + h, 0) + totalGap;
  const scale = totalNeeded > availableH ? availableH / totalNeeded : 1;
  const quoteFontSize = scale < 0.85 ? 8 : 10;

  let currentY = 1.15;
  testimonials.slice(0, maxShow).forEach((t, i) => {
    const cardH = Math.max(0.8, quoteHeights[i] * scale);
    addCard(slide, { x: MARGIN, y: currentY, w: CONTENT_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });

    const loc = t.location || '';
    let textY = currentY + 0.08;
    if (loc) {
      slide.addText(loc.toUpperCase(), {
        x: MARGIN + 0.2, y: textY, w: CONTENT_W - 0.4, h: 0.2,
        fontSize: 9, fontFace: FONT, color: AA_BLUE, bold: true,
      });
      textY += 0.22;
    }

    const quoteH = cardH - (textY - currentY) - (t.attribution ? 0.3 : 0.1);
    slide.addText(`\u201C${t.quote}\u201D`, {
      x: MARGIN + 0.2, y: textY, w: CONTENT_W - 0.4, h: Math.max(0.3, quoteH),
      fontSize: quoteFontSize, fontFace: FONT, color: MED_GREY, italic: true, valign: 'top',
      lineSpacingMultiple: 1.2,
    });

    if (t.attribution) {
      slide.addText(`\u2014 ${t.attribution}`, {
        x: MARGIN + 0.2, y: currentY + cardH - 0.28, w: CONTENT_W - 0.4, h: 0.25,
        fontSize: 9, fontFace: FONT, color: DARK, bold: true,
      });
    }

    currentY += cardH + 0.15;
  });

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 12: E.1 Addressing Key Operational Challenges ─

function addChallengesSlide(pptx, form, logoColor, narratives) {
  const items = (form.challenges.items || []).filter((r) => r.challenge);

  // Parse agent narrative for challenges if available
  // Format: "location | challenge text | action text" per line
  const agentChallengeLines = getNarrativeLines(narratives, 'E1:CHALLENGES');
  let allChallengeTexts = [];
  let allActionTexts = [];
  if (agentChallengeLines) {
    for (const line of agentChallengeLines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const loc = parts[0];
        let text = parts[1];
        if (loc) {
          const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const trailingLoc = new RegExp(`\\s*\\(${escaped}\\)\\.?\\s*$`, 'i');
          text = text.replace(trailingLoc, '');
          const trailingSuffix = new RegExp(`\\s*[\\-\\u2014]\\s*${escaped}\\.?\\s*$`, 'i');
          text = text.replace(trailingSuffix, '');
        }
        allChallengeTexts.push(loc ? `${text} (${loc})` : text);
        allActionTexts.push(parts[2]);
      } else if (parts.length === 2) {
        allChallengeTexts.push(parts[0]);
        allActionTexts.push(parts[1]);
      } else {
        allChallengeTexts.push(line);
        allActionTexts.push('\u2014');
      }
    }
  } else {
    allChallengeTexts = items.length
      ? items.map((r) => {
          if (!r.location) return r.challenge;
          const locPattern = new RegExp(`\\s*\\(${r.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*\\.?\\s*$`, 'i');
          const cleaned = r.challenge.replace(locPattern, '');
          return `${cleaned} (${r.location})`;
        })
      : [];
    allActionTexts = items.length
      ? items.map((r) => r.action || '\u2014')
      : [];
  }

  // Render in batches of 4 per slide
  const perSlide = 4;
  const totalBatches = Math.max(1, Math.ceil(allChallengeTexts.length / perSlide));

  for (let batch = 0; batch < totalBatches; batch++) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, batch === 0
      ? 'Addressing Key Operational Challenges'
      : 'Addressing Key Operational Challenges (cont.)');

    const startIdx = batch * perSlide;
    const challengeTexts = allChallengeTexts.slice(startIdx, startIdx + perSlide);
    const actionTexts = allActionTexts.slice(startIdx, startIdx + perSlide);

    const x1 = MARGIN;
    const x2 = MARGIN + COL2_W + 0.3;
    const cardY = 1.15;
    const maxCardH = SLIDE_H - cardY - 0.45;
    const bulletCount = Math.max(challengeTexts.length, 1);
    const cardH = Math.min(calcCardH(bulletCount, { headerH: 0.55, itemH: 0.5, maxH: maxCardH }), maxCardH);

    // Challenges Identified card (amber header)
    addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH });
    slide.addShape('rect', {
      x: x1, y: cardY, w: COL2_W, h: 0.4,
      fill: { color: AMBER }, rectRadius: 0.03,
    });
    slide.addShape('rect', {
      x: x1, y: cardY + 0.2, w: COL2_W, h: 0.2,
      fill: { color: AMBER },
    });
    slide.addText('CHALLENGES IDENTIFIED', {
      x: x1, y: cardY, w: COL2_W, h: 0.4,
      fontSize: 11, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
    });
    if (challengeTexts.length) {
      addCardBullets(slide, challengeTexts, { x: x1, y: cardY + 0.6, w: COL2_W, h: cardH - 0.8 });
    }

    // Actions Taken card (green header)
    addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH });
    slide.addShape('rect', {
      x: x2, y: cardY, w: COL2_W, h: 0.4,
      fill: { color: GREEN }, rectRadius: 0.03,
    });
    slide.addShape('rect', {
      x: x2, y: cardY + 0.2, w: COL2_W, h: 0.2,
      fill: { color: GREEN },
    });
    slide.addText('ACTIONS TAKEN', {
      x: x2, y: cardY, w: COL2_W, h: 0.4,
      fontSize: 11, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
    });
    if (actionTexts.length) {
      addCardBullets(slide, actionTexts, { x: x2, y: cardY + 0.6, w: COL2_W, h: cardH - 0.8 });
    }

    addLogoBottomRight(slide, logoColor);
  }
}

// ── Slide 13: F.1 Current Financial Overview ────────────

function addFinancialSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Current Financial Overview');

  const f = form.financial;
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;
  const cardY = 1.15;
  const cardH = 3.8;

  // Left: Outstanding Invoices card with hero $ amount
  addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH });
  // Blue header
  slide.addShape('rect', {
    x: x1, y: cardY, w: COL2_W, h: 0.4,
    fill: { color: AA_BLUE }, rectRadius: 0.03,
  });
  slide.addShape('rect', {
    x: x1, y: cardY + 0.2, w: COL2_W, h: 0.2,
    fill: { color: AA_BLUE },
  });
  slide.addText('OUTSTANDING INVOICES', {
    x: x1, y: cardY, w: COL2_W, h: 0.4,
    fontSize: 11, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
  });

  // Hero amount — ensure currency formatted
  slide.addText(fmtCurrency(f.totalOutstanding), {
    x: x1 + 0.2, y: cardY + 0.6, w: COL2_W - 0.4, h: 0.7,
    fontSize: 32, fontFace: FONT, color: AA_BLUE, bold: true, align: 'center',
  });
  slide.addText(`Total Outstanding (as of ${f.asOfDate || 'current'})`, {
    x: x1 + 0.2, y: cardY + 1.3, w: COL2_W - 0.4, h: 0.25,
    fontSize: 9, fontFace: FONT, color: MED_GREY, align: 'center',
  });

  // Aging breakdown below hero amount — ensure currency formatted
  const bucketData = [
    ['Aging', 'Amount'],
    ['1-30 days', fmtCurrency(f.bucket30)],
    ['31-60 days', fmtCurrency(f.bucket60)],
    ['61-90 days', fmtCurrency(f.bucket90)],
    ['91+ days', fmtCurrency(f.bucket91)],
  ];

  // Color-code amounts
  const getAmountColor = (val) => {
    const num = parseFloat(String(val).replace(/[$,]/g, ''));
    if (!num || num === 0) return GREEN;
    if (num > 50000) return AA_RED;
    if (num > 10000) return AMBER;
    return GREEN;
  };

  const agingRows = bucketData.map((row, ri) =>
    row.map((cell, ci) => ({
      text: String(cell),
      options: ri === 0
        ? { bold: true, fontSize: 9, fontFace: FONT, color: DARK, align: ci === 0 ? 'left' : 'right' }
        : {
            fontSize: 10, fontFace: FONT, align: ci === 0 ? 'left' : 'right',
            color: ci === 1 ? getAmountColor(cell) : DARK,
            bold: ci === 1,
          },
    }))
  );

  slide.addTable(agingRows, {
    x: x1 + 0.3, y: cardY + 1.7, w: COL2_W - 0.6,
    border: { type: 'none' },
    rowH: 0.32,
  });

  // Right: Financial Strategy card (blue left border) — prefer agent narrative
  addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });
  slide.addText('FINANCIAL STRATEGY', {
    x: x2 + 0.2, y: cardY + 0.15, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  const strategyNarrative = getNarrativeLines(narratives, 'F1:STRATEGY');
  const notes = strategyNarrative || (f.strategyNotes || []).filter(Boolean);
  if (notes.length) {
    addCardBullets(slide, notes, { x: x2, y: cardY + 0.6, w: COL2_W, h: cardH - 0.8 });
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 14: G.1 Innovation & Technology Integration ───

function addInnovationSlide(pptx, form, logoColor, narratives) {
  const rawHighlights = (form.roadmap.highlights || []).filter((h) => h.innovation);
  if (!rawHighlights.length) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, 'Innovation & Technology Integration');
    slide.addText('No innovation highlights reported this quarter.', {
      x: MARGIN, y: 2.5, w: CONTENT_W, h: 0.5,
      fontSize: 12, fontFace: FONT, color: MED_GREY, italic: true, align: 'center',
    });
    addLogoBottomRight(slide, logoColor);
    return;
  }

  // Prefer agent narrative — parse "innovation name | description with benefit" lines
  const narrativeLines = getNarrativeLines(narratives, 'G1:INNOVATIONS');
  let highlights;
  if (narrativeLines) {
    const merged = {};
    narrativeLines.forEach((line) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        const key = parts[0].toLowerCase().trim();
        if (!merged[key]) merged[key] = { innovation: parts[0], bullets: [] };
        merged[key].bullets.push(parts[1]);
      } else {
        const key = line.toLowerCase().trim();
        if (!merged[key]) merged[key] = { innovation: line, bullets: [] };
      }
    });
    highlights = Object.values(merged);
  } else {
    const merged = {};
    rawHighlights.forEach((h) => {
      const key = (h.innovation || '').toLowerCase().trim();
      if (!merged[key]) merged[key] = { innovation: h.innovation, bullets: [] };
      if (h.description) merged[key].bullets.push(h.description);
      if (h.benefit) merged[key].bullets.push(`Benefit: ${h.benefit}`);
    });
    highlights = Object.values(merged);
  }

  // Render in batches of 3 per slide
  for (let batch = 0; batch < highlights.length; batch += 3) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, batch === 0
      ? 'Innovation & Technology Integration'
      : 'Innovation & Technology Integration (cont.)');

    const batchItems = highlights.slice(batch, batch + 3);
    const cardY = 1.15;
    const gap = 0.3;
    const show = batchItems.length;
    const colW = show === 1 ? CONTENT_W : show === 2 ? COL2_W : COL3_W;
    const colGap = show === 2 ? 0.3 : gap;
    const maxCardH = SLIDE_H - cardY - 0.45;
    const maxBulletH = Math.max(...batchItems.map((h) => estimateBulletH(h.bullets, colW - 0.5)));
    const cardH = Math.min(maxBulletH + 0.8, maxCardH);

    batchItems.forEach((h, i) => {
      const x = MARGIN + i * (colW + colGap);
      addCard(slide, { x, y: cardY, w: colW, h: cardH, borderColor: AA_BLUE, borderSide: 'top' });
      slide.addText((h.innovation || '').toUpperCase(), {
        x: x + 0.15, y: cardY + 0.15, w: colW - 0.3, h: 0.3,
        fontSize: 10, fontFace: FONT, color: DARK, bold: true,
      });
      if (h.bullets.length) {
        addCardBullets(slide, h.bullets, { x, y: cardY + 0.6, w: colW, h: cardH - 0.8 });
      }
    });

    addLogoBottomRight(slide, logoColor);
  }
}

// ── Slide 15: G.2 Roadmap — Strategic Initiatives ───────

function addRoadmapSlide(pptx, form, logoColor, narratives) {
  const r = form.roadmap;
  const q = form.cover.quarter || '';
  const titleBase = `${q ? q.replace(/Q(\d)/, (_, n) => `Q${(Number(n) % 4) + 1}`) + ' ' : ''}Roadmap \u2014 Strategic Initiatives`;

  // Prefer agent narrative for roadmap items — parse "month | initiative | details" lines
  const narrativeLines = getNarrativeLines(narratives, 'G2:ROADMAP');
  let schedule;
  if (narrativeLines) {
    schedule = narrativeLines.map((line) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        return { month: parts[0], initiative: parts[1], details: parts[2] };
      } else if (parts.length === 2) {
        return { month: parts[0], initiative: parts[1], details: '' };
      }
      return { month: '', initiative: line, details: '' };
    }).filter((s) => s.initiative);
  } else {
    schedule = (r.schedule || []).filter((s) => s.initiative);
  }

  // Goal statement — prefer agent narrative, fall back to form data
  const goalText = getNarrativeText(narratives, 'G2:GOAL') || r.goalStatement;

  // Render in batches of 3 items per slide, goal on the LAST slide
  const perSlide = 3;
  const totalBatches = Math.max(1, Math.ceil(schedule.length / perSlide));

  for (let batch = 0; batch < totalBatches; batch++) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, batch === 0 ? titleBase : `${titleBase} (cont.)`);

    const startIdx = batch * perSlide;
    const batchItems = schedule.slice(startIdx, startIdx + perSlide);

    batchItems.forEach((item, i) => {
      const y = 1.2 + i * 1.35;

      const rawMonth = (item.month || '').trim();
      const monthLabel = rawMonth.length <= 3
        ? rawMonth.toUpperCase()
        : rawMonth.toUpperCase().substring(0, 3);

      // Month block (blue rounded rect)
      slide.addShape('roundRect', {
        x: MARGIN, y, w: 1.1, h: 1.0,
        fill: { color: AA_BLUE }, rectRadius: 0.05,
      });
      // Red accent on top-left of month block
      slide.addShape('rect', {
        x: MARGIN + 0.05, y, w: 0.3, h: 0.04,
        fill: { color: AA_RED },
      });
      slide.addText(monthLabel, {
        x: MARGIN, y: y + 0.15, w: 1.1, h: 0.7,
        fontSize: 16, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
      });

      // Content card next to month block
      const cardX = MARGIN + 1.3;
      const cardW = CONTENT_W - 1.3;
      addCard(slide, { x: cardX, y, w: cardW, h: 1.0 });

      slide.addText(item.initiative || '', {
        x: cardX + 0.2, y: y + 0.08, w: cardW - 0.4, h: 0.3,
        fontSize: 11, fontFace: FONT, color: DARK, bold: true,
      });
      slide.addText(item.details || '', {
        x: cardX + 0.2, y: y + 0.38, w: cardW - 0.4, h: 0.55,
        fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
      });
    });

    // Goal statement on the LAST slide only
    const isLastSlide = batch === totalBatches - 1;
    if (isLastSlide && goalText) {
      const goalLines = goalText.split('\n').filter(Boolean);
      const uniqueGoal = [...new Set(goalLines)].join('\n');
      const goalY = Math.min(1.2 + batchItems.length * 1.35 + 0.15, 4.85);
      slide.addText(
        [
          { text: `${q || 'Quarter'} Goal: `, options: { bold: true, color: AA_BLUE, fontSize: 10 } },
          { text: uniqueGoal, options: { bold: false, color: DARK, fontSize: 10 } },
        ],
        {
          x: MARGIN, y: goalY, w: CONTENT_W, h: 0.5,
          fontFace: FONT, valign: 'top',
        }
      );
    }

    addLogoBottomRight(slide, logoColor);
  }
}

// ── Slide 16: Thank You ─────────────────────────────────

function addThankYouSlide(pptx, form, logoWhite) {
  const slide = pptx.addSlide();
  slide.background = { fill: NEAR_BLACK };

  // Decorative circle (left side — mirrored from cover)
  slide.addShape('ellipse', {
    x: -2.0, y: -1.5, w: 5.5, h: 5.5,
    fill: { color: CIRCLE_BLUE, transparency: 60 },
  });
  slide.addShape('ellipse', {
    x: -1.5, y: -1.0, w: 4.5, h: 4.5,
    fill: { color: CIRCLE_BLUE_LIGHT, transparency: 50 },
  });

  // "Thank You" in white
  slide.addText('Thank You', {
    x: MARGIN, y: 1.8, w: 6.0, h: 0.8,
    fontSize: 40, fontFace: FONT, color: WHITE, bold: false,
  });

  // Red accent line
  slide.addShape('rect', {
    x: MARGIN, y: 2.7, w: 1.8, h: 0.04,
    fill: { color: AA_RED },
  });

  // Closing message
  slide.addText(
    'We look forward to further collaboration and\ndelivering greater operational efficiencies.',
    {
      x: MARGIN, y: 3.0, w: 6.0, h: 0.7,
      fontSize: 13, fontFace: FONT, color: MED_GREY, lineSpacingMultiple: 1.4,
    }
  );

  // Logo bottom-left — actual ratio is 2.83:1
  if (logoWhite) {
    slide.addImage({ data: logoWhite, x: MARGIN, y: 4.7, w: 1.1, h: 0.39 });
  }

  // Red diamond accent
  slide.addShape('diamond', {
    x: 8.2, y: 4.3, w: 0.18, h: 0.18,
    fill: { color: AA_RED },
  });

  // aaefs.com bottom-right
  slide.addText('aaefs.com', {
    x: 8.0, y: 4.85, w: 1.5, h: 0.3,
    fontSize: 10, fontFace: FONT, color: MED_GREY, align: 'right',
  });
}

// ── Main Export ───────────────────────────────────────────

export async function generateQBUPptx(form, agentOutput) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'QBU_16x9', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'QBU_16x9';
  pptx.author = 'A&A Elevated Facility Solutions';
  pptx.subject = `QBU — ${form.cover.clientName || 'Client'} — ${form.cover.quarter || ''}`;
  pptx.title = `QBU ${form.cover.clientName || 'Client'} ${form.cover.quarter || ''}`;

  // Fetch logos
  const [logoWhite, logoColor] = await Promise.all([
    fetchLogoBase64('/logo-white.png'),
    fetchLogoBase64('/logo-color.png'),
  ]);

  // Parse agent narrative blocks (gracefully returns {} if none found)
  const narratives = parseAgentNarratives(agentOutput);

  // Build slides in section order matching the QBU skill template
  addCoverSlide(pptx, form, logoWhite);                              // 1  — Title
  addIntroductionsSlide(pptx, form, logoColor);                      // 2  — Introductions
  addSafetyMomentSlide(pptx, form, logoColor, narratives);           // 3  — A.1
  addSafetyComplianceSlide(pptx, form, logoColor);                  // 4  — A.2
  addExecutiveSummarySlide(pptx, form, logoColor, narratives);      // 5  — B.1
  addWorkTicketsSlide(pptx, form, logoColor, narratives);           // 6  — C.1
  addAuditsSlide(pptx, form, logoColor, narratives);                // 7  — C.2
  addTopAreasSlide(pptx, form, logoColor, narratives);               // 8  — C.3
  addCompletedProjectsSlide(pptx, form, logoColor, narratives);     // 9  — D.1
  await addPhotoSlides(pptx, form, logoColor);                       // 10 — D.2
  addTestimonialsSlide(pptx, form, logoColor, narratives);          // 11 — D.3
  addChallengesSlide(pptx, form, logoColor, narratives);            // 12 — E.1
  addFinancialSlide(pptx, form, logoColor, narratives);             // 13 — F.1
  addInnovationSlide(pptx, form, logoColor, narratives);            // 14 — G.1
  addRoadmapSlide(pptx, form, logoColor, narratives);               // 15 — G.2
  addThankYouSlide(pptx, form, logoWhite);                           // 16 — Thank You

  // Generate filename and trigger download
  const client = (form.cover.clientName || 'QBU').replace(/[^a-zA-Z0-9]/g, '-');
  const quarter = (form.cover.quarter || '').replace(/\s+/g, '');
  const filename = `QBU_${client}_${quarter}`;

  await pptx.writeFile({ fileName: filename });
}
