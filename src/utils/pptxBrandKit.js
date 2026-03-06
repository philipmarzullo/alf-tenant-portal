// ── A&A PPTX Brand Kit ─────────────────────────────────
// Shared brand constants, layout math, helpers, and parameterized
// cover/thank-you slides used by both QBU and Sales Deck templates.

// ── Brand Constants ──────────────────────────────────────
export const AA_BLUE = '009ADE';
export const AA_RED = 'E12F2C';
export const DARK = '272727';
export const MED_GREY = '5A5D62';
export const NEAR_BLACK = '1B2133';
export const WHITE = 'FFFFFF';
export const LIGHT_BG = 'F2F2F2';
export const CARD_BG = WHITE;
export const CALLOUT_BG = 'E8F4FD';
export const GREEN = '43A047';
export const AMBER = 'F0A030';
export const FONT = 'Roboto';

// Circle overlay color for cover/thank-you slides
export const CIRCLE_BLUE = '1E3A5F';
export const CIRCLE_BLUE_LIGHT = '2A5080';

// ── Layout Constants (16:9 = 10" × 5.625") ──────────────
export const SLIDE_W = 10;
export const SLIDE_H = 5.625;
export const MARGIN = 0.6;
export const CONTENT_W = SLIDE_W - MARGIN * 2;

// Card dimensions for 2-column and 3-column layouts
export const COL2_W = (CONTENT_W - 0.3) / 2;
export const COL3_W = (CONTENT_W - 0.6) / 3;

// Safe content bottom — logo sits at y=5.15, content must end above this
export const LOGO_SAFE_Y = 5.0;

// ── Helpers ──────────────────────────────────────────────

export async function fetchLogoBase64(path) {
  try {
    const resp = await fetch(path);
    const blob = await resp.blob();
    const data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    // Detect actual aspect ratio to prevent stretching
    const ratio = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
      img.onerror = () => resolve(2.83); // fallback
      img.src = data;
    });
    return { data, ratio };
  } catch {
    return null;
  }
}

export function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// ── Slide Design System ──────────────────────────────────

/** Light gray background for all content slides */
export function setContentBackground(slide) {
  slide.background = { fill: LIGHT_BG };
}

/** Section title: large A&A Blue text + red accent underline */
export function addSectionTitle(slide, title) {
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

/** Logo in bottom-right corner — uses actual image aspect ratio */
export function addLogoBottomRight(slide, logoColor) {
  if (!logoColor) return;
  const { data, ratio } = typeof logoColor === 'string' ? { data: logoColor, ratio: 2.83 } : logoColor;
  const maxW = 0.65, maxH = 0.3;
  const w = Math.min(maxW, maxH * ratio);
  const h = w / ratio;
  slide.addImage({ data, x: SLIDE_W - MARGIN - w, y: SLIDE_H - 0.15 - h, w, h });
}

/** White card with optional colored top border */
export function addCard(slide, { x, y, w, h, borderColor, borderSide = 'top' }) {
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
export function addCalloutBox(slide, { x, y, w, h, label, text, fontSize = 10 }) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: CALLOUT_BG }, rectRadius: 0.05,
  });
  const parts = [];
  if (label) {
    parts.push({ text: label, options: { bold: true, fontSize, color: DARK } });
  }
  if (text) {
    parts.push({ text: (label ? ' ' : '') + text, options: { bold: false, fontSize, color: DARK } });
  }
  slide.addText(parts, {
    x: x + 0.2, y: y + 0.1, w: w - 0.4, h: h - 0.2,
    fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.2,
  });
}

/** Branded table matching reference deck style */
export function addBrandedTable(slide, rows, opts = {}) {
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
export function addCardBullets(slide, items, { x, y, w, h, fontSize: fs, lineSpacing } = {}) {
  const filtered = (items || []).filter(Boolean);
  if (!filtered.length) return;
  slide.addText(
    filtered.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
    {
      x: x + 0.25, y, w: w - 0.5, h,
      fontSize: fs || 10, fontFace: FONT, color: DARK, lineSpacingMultiple: lineSpacing || 1.3,
      valign: 'top',
    }
  );
}

/** Calculate adaptive card height based on content */
export function calcCardH(itemCount, { minH = 1.2, maxH = 4.2, headerH = 0.5, itemH = 0.35, padH = 0.3 } = {}) {
  const contentH = headerH + itemCount * itemH + padH;
  return Math.max(minH, Math.min(maxH, contentH));
}

/** Estimate bullet text height — longer bullets wrap and need more space */
export function estimateBulletH(items, colW = 4.0) {
  let total = 0;
  for (const item of (items || [])) {
    const chars = (item || '').length;
    const charsPerLine = Math.floor(colW * 11); // ~11 chars per inch at 10pt (conservative)
    const lines = Math.max(1, Math.ceil(chars / charsPerLine));
    total += lines * 0.24 + 0.08; // line height + inter-bullet spacing
  }
  return total;
}

/** Split bullet items into page-sized chunks that each fit within availH */
export function splitItemsToFit(items, availH, colW = 4.0) {
  if (!items || !items.length) return [[]];
  const pages = [];
  let current = [];
  let currentH = 0;
  for (const item of items) {
    const itemH = estimateBulletH([item], colW);
    if (current.length > 0 && currentH + itemH > availH) {
      pages.push(current);
      current = [item];
      currentH = itemH;
    } else {
      current.push(item);
      currentH += itemH;
    }
  }
  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

/** Format a value as currency if it's a number */
export function fmtCurrency(val) {
  if (!val) return '$0';
  const str = String(val).replace(/[$,]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return val;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Check if a section has meaningful data (not just empty defaults) */
export function hasData(items) {
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
export function parseAgentNarratives(agentOutput) {
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
export function getNarrativeLines(narratives, key) {
  const val = narratives[key];
  if (!val) return null;
  return Array.isArray(val) ? val : [val];
}

/** Get a narrative as a single string */
export function getNarrativeText(narratives, key) {
  const val = narratives[key];
  if (!val) return null;
  return Array.isArray(val) ? val.join('\n') : val;
}

// ── Parameterized Dark Cover Slide ───────────────────────

/**
 * Shared dark cover slide used by both QBU and Sales Deck.
 * @param {object} pptx - PptxGenJS instance
 * @param {object} opts
 * @param {string} opts.primaryText - Large text in AA_BLUE (e.g., client name)
 * @param {string} opts.subtitleText - Subtitle line in MED_GREY
 * @param {string} [opts.dateLine] - Optional date/team line below subtitle
 * @param {string} [opts.teamLine] - Optional second team line
 * @param {string|null} opts.logoWhite - Base64 white logo
 */
export function addDarkCoverSlide(pptx, { primaryText, subtitleText, dateLine, teamLine, logoWhite, websiteUrl }) {
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

  // Primary text in A&A Blue
  slide.addText(primaryText || '', {
    x: MARGIN, y: 1.8, w: 7.0, h: 0.9,
    fontSize: 36, fontFace: FONT, color: AA_BLUE, bold: false,
  });

  // Subtitle
  slide.addText(subtitleText || '', {
    x: MARGIN, y: 2.75, w: 7.0, h: 0.4,
    fontSize: 14, fontFace: FONT, color: MED_GREY,
  });

  // Red accent line
  slide.addShape('rect', {
    x: MARGIN, y: 3.25, w: 1.8, h: 0.04,
    fill: { color: AA_RED },
  });

  // Optional date/team lines
  if (dateLine) {
    slide.addText(dateLine, {
      x: MARGIN, y: 3.45, w: 7.0, h: 0.3,
      fontSize: 11, fontFace: FONT, color: MED_GREY,
    });
  }
  if (teamLine) {
    slide.addText(teamLine, {
      x: MARGIN, y: 3.75, w: 7.0, h: 0.3,
      fontSize: 11, fontFace: FONT, color: MED_GREY,
    });
  }

  // Logo bottom-left — uses actual aspect ratio
  if (logoWhite) {
    const { data, ratio } = typeof logoWhite === 'string' ? { data: logoWhite, ratio: 2.83 } : logoWhite;
    const maxW = 1.1, maxH = 0.45;
    const w = Math.min(maxW, maxH * ratio);
    const h = w / ratio;
    slide.addImage({ data, x: MARGIN, y: 5.0 - h, w, h });
  }

  // Website URL bottom-right
  slide.addText(websiteUrl || '', {
    x: 8.0, y: 5.1, w: 1.5, h: 0.3,
    fontSize: 10, fontFace: FONT, color: MED_GREY, align: 'right',
  });

  return slide;
}

// ── Parameterized Dark Thank-You Slide ───────────────────

/**
 * Shared dark thank-you slide used by both QBU and Sales Deck.
 * @param {object} pptx - PptxGenJS instance
 * @param {object} opts
 * @param {string} [opts.closingMessage] - Closing text in MED_GREY
 * @param {string|null} opts.logoWhite - Base64 white logo
 */
export function addDarkThankYouSlide(pptx, { closingMessage, logoWhite, websiteUrl }) {
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
  if (closingMessage) {
    slide.addText(closingMessage, {
      x: MARGIN, y: 3.0, w: 6.0, h: 0.7,
      fontSize: 13, fontFace: FONT, color: MED_GREY, lineSpacingMultiple: 1.4,
    });
  }

  // Logo bottom-left — uses actual aspect ratio
  if (logoWhite) {
    const { data, ratio } = typeof logoWhite === 'string' ? { data: logoWhite, ratio: 2.83 } : logoWhite;
    const maxW = 1.1, maxH = 0.45;
    const w = Math.min(maxW, maxH * ratio);
    const h = w / ratio;
    slide.addImage({ data, x: MARGIN, y: 5.0 - h, w, h });
  }

  // Red diamond accent
  slide.addShape('diamond', {
    x: 8.2, y: 4.3, w: 0.18, h: 0.18,
    fill: { color: AA_RED },
  });

  // Website URL bottom-right
  slide.addText(websiteUrl || '', {
    x: 8.0, y: 4.85, w: 1.5, h: 0.3,
    fontSize: 10, fontFace: FONT, color: MED_GREY, align: 'right',
  });

  return slide;
}
