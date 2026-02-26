import PptxGenJS from 'pptxgenjs';
import {
  AA_BLUE, AA_RED, DARK, MED_GREY, NEAR_BLACK, WHITE,
  FONT, SLIDE_W, SLIDE_H, MARGIN, CONTENT_W, COL2_W, LOGO_SAFE_Y,
  fetchLogoBase64,
  setContentBackground, addSectionTitle, addLogoBottomRight,
  addCard, addCalloutBox, addCardBullets, calcCardH, estimateBulletH,
  splitItemsToFit,
  parseAgentNarratives, getNarrativeLines, getNarrativeText,
  addDarkCoverSlide, addDarkThankYouSlide,
} from './pptxBrandKit';

// ── Fallback Parser ─────────────────────────────────────
// If no NARRATIVE blocks found, parse plain-text slide output heuristically.

function parsePlainTextSlides(text) {
  const slides = {};
  const slideRegex = /\*{0,2}SLIDE\s+(\d+)\s*[:—]\s*\*{0,2}\s*([^\n]*)/gi;
  let match;
  const positions = [];

  while ((match = slideRegex.exec(text)) !== null) {
    positions.push({ num: match[1], title: match[2].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start - 100 : text.length;
    const section = text.substring(positions[i].start, end).trim();

    const bullets = section.split('\n')
      .filter(l => /^[\s]*[•\-]\s/.test(l))
      .map(l => l.replace(/^[\s]*[•\-]\s*/, '').trim())
      .filter(Boolean);

    const notesMatch = section.match(/(?:Presenter\s+)?Notes?:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const notes = notesMatch ? notesMatch[1].trim() : '';

    slides[positions[i].num] = { bullets, notes };
  }

  return slides;
}

// ── Stat Detection ──────────────────────────────────────

const STAT_RE = /^(\d[\d.,]*[%+]+)\s+/;

function splitStatBullets(bullets) {
  const stats = [];
  const context = [];
  for (const b of bullets) {
    const m = b.match(STAT_RE);
    if (m) {
      stats.push({ stat: m[1], desc: b.slice(m[0].length).trim() });
    } else {
      context.push(b);
    }
  }
  return { stats, context };
}

// ── Slide Builders ──────────────────────────────────────

/** Slide 2: Why Performance Matters — hero metric cards + context callout */
function addPerformanceSlide(pptx, bullets, notes, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Why Performance Matters');

  const defaultBullets = [
    '98%+ client retention rate — our clients stay because we deliver',
    '99%+ SLA compliance across all managed accounts',
    '7+ year average client relationship duration',
    '53 years of continuous operations under stable leadership',
  ];
  const items = bullets.length >= 3 ? bullets : defaultBullets;
  const { stats, context } = splitStatBullets(items);

  if (stats.length >= 2) {
    // ── Hero metric cards ──────────────────────────────
    const count = Math.min(stats.length, 4);
    const gap = 0.25;
    const totalGap = gap * (count - 1);
    const cardW = (CONTENT_W - totalGap) / count;
    const cardH = 1.6;
    const startY = 1.15;

    stats.slice(0, count).forEach((s, i) => {
      const x = MARGIN + i * (cardW + gap);
      addCard(slide, { x, y: startY, w: cardW, h: cardH, borderColor: AA_BLUE });

      // Large stat number
      slide.addText(s.stat, {
        x: x + 0.2, y: startY + 0.15, w: cardW - 0.4, h: 0.55,
        fontSize: 26, fontFace: FONT, color: AA_BLUE, bold: true,
      });

      // Red accent underline below stat
      slide.addShape('rect', {
        x: x + 0.2, y: startY + 0.75, w: 0.8, h: 0.035,
        fill: { color: AA_RED },
      });

      // Description text
      slide.addText(s.desc, {
        x: x + 0.2, y: startY + 0.85, w: cardW - 0.4, h: 0.6,
        fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
      });
    });

    // Context bullets as callout below cards
    if (context.length > 0) {
      const callY = startY + cardH + 0.25;
      const callH = Math.min(estimateBulletH(context, CONTENT_W - 0.6) + 0.25, LOGO_SAFE_Y - callY);
      addCalloutBox(slide, {
        x: MARGIN, y: callY, w: CONTENT_W, h: Math.max(callH, 0.55),
        label: '', text: context.join('  •  '),
      });
    }
  } else {
    // ── Fallback: full-width bulleted card ───────────────
    const cardY = 1.15;
    const bulletH = estimateBulletH(items, CONTENT_W - 0.5);
    const cardH = Math.min(Math.max(bulletH + 0.6, 1.5), LOGO_SAFE_Y - cardY);
    addCard(slide, { x: MARGIN, y: cardY, w: CONTENT_W, h: cardH, borderColor: AA_BLUE });
    addCardBullets(slide, items, { x: MARGIN, y: cardY + 0.2, w: CONTENT_W, h: cardH - 0.4 });
  }

  if (notes) slide.addNotes(notes);
  addLogoBottomRight(slide, logoColor);
}

/** Slide 3: Understanding Your Needs — 2-column cards with prefix stripping */
function addNeedsSlide(pptx, bullets, notes, form, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Understanding Your Needs');

  // Strip category prefixes from display text
  const stripPrefix = (b) =>
    b.replace(/^(?:CHALLENGES?|KEY CHALLENGES?|WHAT WE HEARD|DRIVERS? FOR CHANGE|REASONS? FOR CHANGE|SPECIAL REQUIREMENTS?):\s*/i, '');

  // Split bullets into two buckets
  const challenges = [];
  const heard = [];
  let currentBucket = challenges;

  for (const b of bullets) {
    const lower = b.toLowerCase();
    if (lower.startsWith('challenges') || lower.startsWith('key challenge')) {
      currentBucket = challenges;
      const stripped = stripPrefix(b);
      if (stripped) challenges.push(stripped);
      continue;
    }
    if (lower.startsWith('what we heard') || lower.startsWith('driver for change') || lower.startsWith('reason for change') || lower.startsWith('special requirement')) {
      currentBucket = heard;
      const stripped = stripPrefix(b);
      if (stripped) heard.push(stripped);
      continue;
    }
    currentBucket.push(stripPrefix(b));
  }

  // Fallback: use form data for right column if no split happened
  if (!heard.length) {
    if (form.reasonForChange) heard.push(`Driver for change: ${form.reasonForChange}`);
    if (form.specialRequirements) heard.push(`Special requirements: ${form.specialRequirements}`);
    if (!heard.length) heard.push(...challenges.splice(Math.ceil(challenges.length / 2)));
  }

  const cardY = 1.15;
  const maxItems = Math.max(challenges.length, heard.length, 2);
  const maxAvailH = LOGO_SAFE_Y - cardY;
  const cardH = Math.min(calcCardH(maxItems, { headerH: 0.55, itemH: 0.35 }), maxAvailH);
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;

  // Left: Key Challenges
  addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH, borderColor: AA_RED, borderSide: 'left' });
  slide.addText('KEY CHALLENGES', {
    x: x1 + 0.2, y: cardY + 0.12, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  // Overflow protection: only show as many bullets as fit
  const challAvailH = cardH - 0.65;
  const challPages = splitItemsToFit(challenges, challAvailH, COL2_W - 0.5);
  addCardBullets(slide, challPages[0], { x: x1, y: cardY + 0.5, w: COL2_W, h: challAvailH });

  // Right: What We Heard
  addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });
  slide.addText('WHAT WE HEARD', {
    x: x2 + 0.2, y: cardY + 0.12, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  const heardAvailH = cardH - 0.65;
  const heardPages = splitItemsToFit(heard, heardAvailH, COL2_W - 0.5);
  addCardBullets(slide, heardPages[0], { x: x2, y: cardY + 0.5, w: COL2_W, h: heardAvailH });

  if (notes) slide.addNotes(notes);
  addLogoBottomRight(slide, logoColor);
}

/** Bullet bars slide — each bullet as its own horizontal card with colored left accent */
function addBulletBarsSlide(pptx, { title, bullets, notes, logoColor, numbered = false }) {
  const items = (bullets || []).filter(Boolean);
  if (!items.length) {
    addSingleCardSlide(pptx, { title, bullets: ['No content available'], notes, logoColor });
    return;
  }

  const startY = 1.15;
  const barGap = 0.12;
  const barPadX = 0.2;
  const minBarH = 0.45;
  const maxAvailH = LOGO_SAFE_Y - startY;

  // Calculate adaptive bar height per item
  function calcBarH(text) {
    const chars = (text || '').length;
    const charsPerLine = Math.floor((CONTENT_W - 0.8) * 11);
    const lines = Math.max(1, Math.ceil(chars / charsPerLine));
    return Math.max(minBarH, lines * 0.24 + 0.22);
  }

  // Paginate: figure out which bars fit on each slide
  const pages = [];
  let page = [];
  let pageH = 0;

  for (const item of items) {
    const barH = calcBarH(item);
    const needed = page.length === 0 ? barH : barH + barGap;
    if (page.length > 0 && pageH + needed > maxAvailH) {
      pages.push(page);
      page = [item];
      pageH = barH;
    } else {
      page.push(item);
      pageH += needed;
    }
  }
  if (page.length) pages.push(page);

  // Render each page as a slide
  pages.forEach((pageItems, pageIdx) => {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    const slideTitle = pages.length > 1 ? `${title} (${pageIdx + 1}/${pages.length})` : title;
    addSectionTitle(slide, slideTitle);

    let y = startY;
    pageItems.forEach((text, i) => {
      const barH = calcBarH(text);
      const globalIdx = pages.slice(0, pageIdx).reduce((n, p) => n + p.length, 0) + i;

      // Card shadow
      slide.addShape('rect', {
        x: MARGIN + 0.02, y: y + 0.02, w: CONTENT_W, h: barH,
        fill: { color: 'E0E0E0' }, rectRadius: 0.03,
      });
      // White bar
      slide.addShape('rect', {
        x: MARGIN, y, w: CONTENT_W, h: barH,
        fill: { color: WHITE }, rectRadius: 0.03,
      });

      if (numbered) {
        // Blue number block on left
        slide.addShape('rect', {
          x: MARGIN, y, w: 0.5, h: barH,
          fill: { color: AA_BLUE }, rectRadius: 0.03,
        });
        // Clean corner overlap: small rect to square off right edge of number block
        slide.addShape('rect', {
          x: MARGIN + 0.35, y, w: 0.2, h: barH,
          fill: { color: AA_BLUE },
        });
        slide.addText(String(globalIdx + 1), {
          x: MARGIN, y, w: 0.5, h: barH,
          fontSize: 16, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
        });
        // Text after number block
        slide.addText(text, {
          x: MARGIN + 0.6, y, w: CONTENT_W - 0.8, h: barH,
          fontSize: 10, fontFace: FONT, color: DARK, valign: 'middle', lineSpacingMultiple: 1.3,
        });
      } else {
        // Colored left accent bar
        slide.addShape('rect', {
          x: MARGIN, y: y + 0.06, w: 0.05, h: barH - 0.12,
          fill: { color: AA_BLUE },
        });
        // Text
        slide.addText(text, {
          x: MARGIN + barPadX, y, w: CONTENT_W - barPadX - 0.15, h: barH,
          fontSize: 10, fontFace: FONT, color: DARK, valign: 'middle', lineSpacingMultiple: 1.3,
        });
      }

      y += barH + barGap;
    });

    if (notes && pageIdx === 0) slide.addNotes(notes);
    addLogoBottomRight(slide, logoColor);
  });
}

/** Generic single-card content slide with overflow protection */
function addSingleCardSlide(pptx, { title, bullets, notes, logoColor }) {
  const items = (bullets || []).filter(Boolean);
  const cardY = 1.15;
  const topPad = 0.25;
  const maxAvailH = LOGO_SAFE_Y - cardY;
  const bulletAvailH = maxAvailH - topPad - 0.2;

  // Split into pages if content overflows
  const pages = splitItemsToFit(items, bulletAvailH, CONTENT_W - 0.5);

  pages.forEach((pageItems, pageIdx) => {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    const slideTitle = pages.length > 1 ? `${title} (${pageIdx + 1}/${pages.length})` : title;
    addSectionTitle(slide, slideTitle);

    const bulletH = estimateBulletH(pageItems, CONTENT_W - 0.5);
    const cardH = Math.min(Math.max(bulletH + 0.8, 1.5), maxAvailH);

    addCard(slide, { x: MARGIN, y: cardY, w: CONTENT_W, h: cardH, borderColor: AA_BLUE });
    addCardBullets(slide, pageItems, { x: MARGIN, y: cardY + topPad, w: CONTENT_W, h: cardH - topPad - 0.2 });

    if (notes && pageIdx === 0) slide.addNotes(notes);
    addLogoBottomRight(slide, logoColor);
  });
}

// ── Main Export ─────────────────────────────────────────

export async function generateSalesDeckPptx(form, agentOutput) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'SALES_16x9', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'SALES_16x9';
  pptx.author = 'A&A Elevated Facility Solutions';
  pptx.subject = `Sales Deck — ${form.companyName || 'Prospect'}`;
  pptx.title = `Sales Presentation — ${form.companyName || 'Prospect'}`;

  // Fetch logos
  const [logoWhite, logoColor] = await Promise.all([
    fetchLogoBase64('/logo-white.png'),
    fetchLogoBase64('/logo-color.png'),
  ]);

  // Parse NARRATIVE blocks from agent output
  const narratives = parseAgentNarratives(agentOutput);
  const hasNarratives = Object.keys(narratives).length > 0;

  // Fallback: parse plain text if no narratives
  let plainSlides = {};
  if (!hasNarratives) {
    plainSlides = parsePlainTextSlides(agentOutput || '');
  }

  // Helper to get slide content
  const getBullets = (slideKey, plainNum) => {
    return getNarrativeLines(narratives, `${slideKey}:BULLETS`)
      || plainSlides[plainNum]?.bullets
      || [];
  };
  const getNotes = (slideKey, plainNum) => {
    return getNarrativeText(narratives, `${slideKey}:NOTES`)
      || plainSlides[plainNum]?.notes
      || '';
  };

  // Build date and team lines for cover
  const dateStr = form.presentationDate
    ? new Date(form.presentationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const aaTeamStr = (form.aaTeam || []).filter(p => p.name).map(p => `${p.name}${p.title ? `, ${p.title}` : ''}`).join('  |  ');

  // Slide 1: Cover — clean tagline only (no "Sales Presentation —" prefix)
  const tagline = getNarrativeText(narratives, 'COVER:TAGLINE') || 'The Performance-Focused Choice';
  addDarkCoverSlide(pptx, {
    primaryText: form.companyName || 'Prospect',
    subtitleText: tagline,
    dateLine: dateStr ? `Date: ${dateStr}` : null,
    teamLine: aaTeamStr ? `A&A Team: ${aaTeamStr}` : null,
    logoWhite,
  });

  // Slide 2: Why Performance Matters — hero metric cards
  addPerformanceSlide(pptx, getBullets('S2', '2'), getNotes('S2', '2'), logoColor);

  // Slide 3: Understanding Your Needs — 2-column with prefix stripping
  addNeedsSlide(pptx, getBullets('S3', '3'), getNotes('S3', '3'), form, logoColor);

  // Slide 4: Our Approach — bullet bars (each capability stands alone)
  addBulletBarsSlide(pptx, {
    title: `Our Approach — ${form.vertical || 'Your Industry'}`,
    bullets: getBullets('S4', '4'),
    notes: getNotes('S4', '4'),
    logoColor,
  });

  // Slide 5: People First — single card (cohesive narrative)
  addSingleCardSlide(pptx, {
    title: 'People First\u2122 & Employee Ownership',
    bullets: getBullets('S5', '5'),
    notes: getNotes('S5', '5'),
    logoColor,
  });

  // Slide 6: Technology — bullet bars (each tool as its own element)
  addBulletBarsSlide(pptx, {
    title: 'Technology & Innovation',
    bullets: getBullets('S6', '6'),
    notes: getNotes('S6', '6'),
    logoColor,
  });

  // Slide 7: Partnership Model — single card (conceptual, unified)
  addSingleCardSlide(pptx, {
    title: 'Partnership Model',
    bullets: getBullets('S7', '7'),
    notes: getNotes('S7', '7'),
    logoColor,
  });

  // Slide 8: Why A&A — single card (closing argument)
  addSingleCardSlide(pptx, {
    title: 'Why A&A',
    bullets: getBullets('S8', '8'),
    notes: getNotes('S8', '8'),
    logoColor,
  });

  // Slide 9: Next Steps — numbered bars (action progression)
  addBulletBarsSlide(pptx, {
    title: 'Next Steps',
    bullets: getBullets('S9', '9'),
    notes: getNotes('S9', '9'),
    logoColor,
    numbered: true,
  });

  // Slide 10: Thank You
  const prospect = form.companyName || 'your team';
  addDarkThankYouSlide(pptx, {
    closingMessage: `We appreciate the opportunity to present to ${prospect}.\nWe look forward to building a performance-driven partnership.`,
    logoWhite,
  });

  // Generate filename and trigger download
  const safeName = (form.companyName || 'Prospect').replace(/[^a-zA-Z0-9]/g, '_');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `AA_Sales_Deck_${safeName}_${today}`;

  await pptx.writeFile({ fileName: filename });
}
