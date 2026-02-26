import PptxGenJS from 'pptxgenjs';
import {
  AA_BLUE, AA_RED, DARK, MED_GREY, NEAR_BLACK, WHITE,
  FONT, SLIDE_W, SLIDE_H, MARGIN, CONTENT_W, COL2_W, LOGO_SAFE_Y,
  fetchLogoBase64,
  setContentBackground, addSectionTitle, addLogoBottomRight,
  addCard, addCalloutBox, addCardBullets, calcCardH, estimateBulletH,
  parseAgentNarratives, getNarrativeLines, getNarrativeText,
  addDarkCoverSlide, addDarkThankYouSlide,
} from './pptxBrandKit';

// ── Fallback Parser ─────────────────────────────────────
// If no NARRATIVE blocks found, parse plain-text slide output heuristically.

function parsePlainTextSlides(text) {
  const slides = {};
  // Match patterns like "SLIDE 2:" or "**SLIDE 2:**"
  const slideRegex = /\*{0,2}SLIDE\s+(\d+)\s*[:—]\s*\*{0,2}\s*([^\n]*)/gi;
  let match;
  const positions = [];

  while ((match = slideRegex.exec(text)) !== null) {
    positions.push({ num: match[1], title: match[2].trim(), start: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start - 100 : text.length;
    const section = text.substring(positions[i].start, end).trim();

    // Extract bullets (lines starting with • or -)
    const bullets = section.split('\n')
      .filter(l => /^[\s]*[•\-]\s/.test(l))
      .map(l => l.replace(/^[\s]*[•\-]\s*/, '').trim())
      .filter(Boolean);

    // Extract presenter notes (text after "Presenter Notes:" or "Notes:")
    const notesMatch = section.match(/(?:Presenter\s+)?Notes?:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const notes = notesMatch ? notesMatch[1].trim() : '';

    slides[positions[i].num] = { bullets, notes };
  }

  return slides;
}

// ── Slide Builders ──────────────────────────────────────

/** Slide 2: Why Performance Matters — 4 metric cards (2×2) + callout */
function addPerformanceSlide(pptx, bullets, notes, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Why Performance Matters');

  // Default metrics if no bullets provided
  const metrics = bullets.length >= 4 ? bullets : [
    '98%+ client retention rate — our clients stay because we deliver',
    '99%+ SLA compliance across all managed accounts',
    '7+ year average client relationship duration',
    '53 years of continuous operations under stable leadership',
  ];

  // 2×2 metric card grid
  const cardW = COL2_W;
  const cardH = 1.35;
  const gap = 0.3;
  const startY = 1.15;

  const positions = [
    { x: MARGIN, y: startY },
    { x: MARGIN + cardW + gap, y: startY },
    { x: MARGIN, y: startY + cardH + 0.2 },
    { x: MARGIN + cardW + gap, y: startY + cardH + 0.2 },
  ];

  const colors = [AA_BLUE, AA_BLUE, AA_BLUE, AA_BLUE];

  metrics.slice(0, 4).forEach((metric, i) => {
    const { x, y } = positions[i];
    addCard(slide, { x, y, w: cardW, h: cardH, borderColor: colors[i] });

    // Extract the lead number/stat if present (before em dash or hyphen)
    const dashIdx = metric.indexOf('—');
    const hyphenIdx = dashIdx < 0 ? metric.indexOf(' - ') : dashIdx;
    if (hyphenIdx > 0 && hyphenIdx < 30) {
      const stat = metric.substring(0, hyphenIdx).trim();
      const desc = metric.substring(hyphenIdx + 1).replace(/^[\s—-]+/, '').trim();
      slide.addText(stat, {
        x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: 0.5,
        fontSize: 18, fontFace: FONT, color: AA_BLUE, bold: true,
      });
      slide.addText(desc, {
        x: x + 0.2, y: y + 0.65, w: cardW - 0.4, h: 0.55,
        fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
      });
    } else {
      slide.addText(metric, {
        x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: cardH - 0.4,
        fontSize: 10, fontFace: FONT, color: DARK, valign: 'middle', lineSpacingMultiple: 1.3,
      });
    }
  });

  // Extra bullets (5+) go into a callout box
  if (metrics.length > 4) {
    const callY = startY + 2 * (cardH + 0.2) + 0.15;
    addCalloutBox(slide, {
      x: MARGIN, y: callY, w: CONTENT_W, h: 0.7,
      label: '', text: metrics.slice(4).join(' | '),
    });
  }

  if (notes) slide.addNotes(notes);
  addLogoBottomRight(slide, logoColor);
}

/** Slide 3: Understanding Your Needs — 2-column cards */
function addNeedsSlide(pptx, bullets, notes, form, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Understanding Your Needs');

  // Split bullets: challenges vs "what we heard"
  const challenges = [];
  const heard = [];
  let currentBucket = challenges;

  for (const b of bullets) {
    const lower = b.toLowerCase();
    if (lower.startsWith('what we heard') || lower.startsWith('driver for change') || lower.startsWith('reason for change') || lower.startsWith('special requirement')) {
      currentBucket = heard;
    }
    currentBucket.push(b);
  }

  // If no split happened, use form data for the right column
  if (!heard.length) {
    if (form.reasonForChange) heard.push(`Driver for change: ${form.reasonForChange}`);
    if (form.specialRequirements) heard.push(`Special requirements: ${form.specialRequirements}`);
    if (!heard.length) heard.push(...challenges.splice(Math.ceil(challenges.length / 2)));
  }

  const cardY = 1.15;
  const maxItems = Math.max(challenges.length, heard.length, 2);
  const cardH = Math.min(calcCardH(maxItems, { headerH: 0.55, itemH: 0.35 }), LOGO_SAFE_Y - cardY);
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;

  // Left: Key Challenges
  addCard(slide, { x: x1, y: cardY, w: COL2_W, h: cardH, borderColor: AA_RED, borderSide: 'left' });
  slide.addText('KEY CHALLENGES', {
    x: x1 + 0.2, y: cardY + 0.12, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  addCardBullets(slide, challenges, { x: x1, y: cardY + 0.5, w: COL2_W, h: cardH - 0.65 });

  // Right: What We Heard
  addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });
  slide.addText('WHAT WE HEARD', {
    x: x2 + 0.2, y: cardY + 0.12, w: COL2_W - 0.4, h: 0.3,
    fontSize: 11, fontFace: FONT, color: DARK, bold: true,
  });
  addCardBullets(slide, heard, { x: x2, y: cardY + 0.5, w: COL2_W, h: cardH - 0.65 });

  if (notes) slide.addNotes(notes);
  addLogoBottomRight(slide, logoColor);
}

/** Generic single-card content slide (used for slides 4-9) */
function addSingleCardSlide(pptx, { title, bullets, notes, logoColor }) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, title);

  const cardY = 1.15;
  const bulletH = estimateBulletH(bullets, CONTENT_W - 0.5);
  const cardH = Math.min(Math.max(bulletH + 0.8, 1.5), LOGO_SAFE_Y - cardY);

  addCard(slide, { x: MARGIN, y: cardY, w: CONTENT_W, h: cardH, borderColor: AA_BLUE });
  addCardBullets(slide, bullets, { x: MARGIN, y: cardY + 0.2, w: CONTENT_W, h: cardH - 0.4 });

  if (notes) slide.addNotes(notes);
  addLogoBottomRight(slide, logoColor);
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

  // Helper to get slide content from narratives or plain-text fallback
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

  // Build date line and team line for cover
  const dateStr = form.presentationDate
    ? new Date(form.presentationDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const aaTeamStr = (form.aaTeam || []).filter(p => p.name).map(p => `${p.name}${p.title ? `, ${p.title}` : ''}`).join('  |  ');

  // Slide 1: Cover
  const tagline = getNarrativeText(narratives, 'COVER:TAGLINE') || 'The Performance-Focused Choice';
  addDarkCoverSlide(pptx, {
    primaryText: form.companyName || 'Prospect',
    subtitleText: `Sales Presentation  —  "${tagline}"`,
    dateLine: dateStr ? `Date: ${dateStr}` : null,
    teamLine: aaTeamStr ? `A&A Team: ${aaTeamStr}` : null,
    logoWhite,
  });

  // Slide 2: Why Performance Matters
  addPerformanceSlide(pptx, getBullets('S2', '2'), getNotes('S2', '2'), logoColor);

  // Slide 3: Understanding Your Needs
  addNeedsSlide(pptx, getBullets('S3', '3'), getNotes('S3', '3'), form, logoColor);

  // Slide 4: Our Approach for [Industry]
  addSingleCardSlide(pptx, {
    title: `Our Approach — ${form.vertical || 'Your Industry'}`,
    bullets: getBullets('S4', '4'),
    notes: getNotes('S4', '4'),
    logoColor,
  });

  // Slide 5: People First & Employee Ownership
  addSingleCardSlide(pptx, {
    title: 'People First\u2122 & Employee Ownership',
    bullets: getBullets('S5', '5'),
    notes: getNotes('S5', '5'),
    logoColor,
  });

  // Slide 6: Technology & Innovation
  addSingleCardSlide(pptx, {
    title: 'Technology & Innovation',
    bullets: getBullets('S6', '6'),
    notes: getNotes('S6', '6'),
    logoColor,
  });

  // Slide 7: Partnership Model
  addSingleCardSlide(pptx, {
    title: 'Partnership Model',
    bullets: getBullets('S7', '7'),
    notes: getNotes('S7', '7'),
    logoColor,
  });

  // Slide 8: Why A&A
  addSingleCardSlide(pptx, {
    title: 'Why A&A',
    bullets: getBullets('S8', '8'),
    notes: getNotes('S8', '8'),
    logoColor,
  });

  // Slide 9: Next Steps
  addSingleCardSlide(pptx, {
    title: 'Next Steps',
    bullets: getBullets('S9', '9'),
    notes: getNotes('S9', '9'),
    logoColor,
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
