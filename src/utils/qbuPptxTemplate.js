import PptxGenJS from 'pptxgenjs';
import {
  AA_BLUE, AA_RED, DARK, MED_GREY, NEAR_BLACK, WHITE, LIGHT_BG, CARD_BG,
  CALLOUT_BG, GREEN, AMBER, FONT, CIRCLE_BLUE, CIRCLE_BLUE_LIGHT,
  SLIDE_W, SLIDE_H, MARGIN, CONTENT_W, COL2_W, COL3_W, LOGO_SAFE_Y,
  fetchLogoBase64, fileToBase64,
  setContentBackground, addSectionTitle, addLogoBottomRight,
  addCard, addCalloutBox, addBrandedTable, addCardBullets,
  calcCardH, estimateBulletH, splitItemsToFit, fmtCurrency, hasData,
  parseAgentNarratives, getNarrativeLines, getNarrativeText,
  addDarkCoverSlide, addDarkThankYouSlide,
} from './pptxBrandKit';
import { getPhotoAsBase64, uploadDeck, saveDeckPath } from '../data/qbuHistory';

// ── Cover Slide (thin wrapper) ───────────────────────────

function addCoverSlide(pptx, form, logoWhite, websiteUrl) {
  const qLine = `Quarterly Business Update  |  ${form.cover.quarter || 'Q#'}`;
  addDarkCoverSlide(pptx, {
    primaryText: form.cover.clientName || 'Client Name',
    subtitleText: qLine,
    logoWhite,
    websiteUrl,
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
  const s = form.safety;
  const theme = s.theme || 'Safety Awareness';
  // Cap tips and reminders to 4 items max — MUST fit on ONE slide
  const allTips = getNarrativeLines(narratives, 'A1:TIPS') || (s.keyTips ? s.keyTips.split('\n').filter(Boolean) : []);
  const allReminders = getNarrativeLines(narratives, 'A1:REMINDERS') || (s.quickReminders ? s.quickReminders.split('\n').filter(Boolean) : []);
  const tips = allTips.slice(0, 4);
  const reminders = allReminders.slice(0, 4);
  const whyItMatters = getNarrativeText(narratives, 'A1:WHYITMATTERS') || s.whyItMatters;
  const hasWhyItMatters = !!whyItMatters;

  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, `Safety Moment \u2014 ${theme}`);

  const cardY = 1.15;
  const maxCardBottom = hasWhyItMatters ? 4.05 : LOGO_SAFE_Y;
  const maxCardH = maxCardBottom - cardY;
  const headerPad = 0.65;
  const bulletColW = COL2_W - 0.5;

  const maxBulletH = Math.max(
    estimateBulletH(tips, bulletColW),
    estimateBulletH(reminders, bulletColW),
    0.5
  );
  const cardH = Math.min(maxBulletH + headerPad, maxCardH);
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

  // Why It Matters callout box
  if (hasWhyItMatters) {
    const callY = cardY + cardH + 0.2;
    addCalloutBox(slide, {
      x: MARGIN, y: callY, w: CONTENT_W, h: 0.85,
      label: 'Why It Matters:', text: whyItMatters,
    });
  }

  const notesA1 = getNarrativeText(narratives, 'NOTES:A1');
  if (notesA1) slide.addNotes(notesA1);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 4: A.2 Safety & Compliance Review ─────────────

function addSafetyComplianceSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Safety & Compliance Review');

  let contentY = 1.15;

  // Combined Inspections + Recordables table — correlates the two metrics
  const inspByQ = (form.safety.inspectionsByQuarter || []).filter(r => r.location);
  const incidents = (form.safety.incidents || []).filter((r) => r.location);

  if (inspByQ.length && incidents.length) {
    // Combined table: Location | Type | Q1 | Q2 | Q3 | Q4 | Annual
    const header = ['Location', 'Metric', 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
    const dataRows = [];
    // Interleave inspections + recordables per location
    const locations = inspByQ.map(r => r.location);
    locations.forEach((loc) => {
      const insp = inspByQ.find(r => r.location === loc);
      const rec = incidents.find(r => r.location === loc);
      if (insp) {
        const vals = [Number(insp.q1) || 0, Number(insp.q2) || 0, Number(insp.q3) || 0, Number(insp.q4) || 0];
        const annual = insp.annual ? String(insp.annual) : String(vals.reduce((a, b) => a + b, 0));
        dataRows.push([loc, 'Inspections', ...vals.map(String), annual]);
      }
      if (rec) {
        const vals = [Number(rec.q1) || 0, Number(rec.q2) || 0, Number(rec.q3) || 0, Number(rec.q4) || 0];
        const annual = rec.annual ? String(rec.annual) : String(vals.reduce((a, b) => a + b, 0));
        dataRows.push(['', 'Recordables', ...vals.map(String), annual]);
      }
    });

    addBrandedTable(slide, [header, ...dataRows], { y: contentY, w: CONTENT_W });
    contentY += (dataRows.length + 1) * 0.35 + 0.2;
  } else if (inspByQ.length) {
    // Inspections only
    slide.addText('SAFETY INSPECTIONS BY QUARTER', {
      x: MARGIN, y: contentY, w: CONTENT_W, h: 0.25,
      fontSize: 9, fontFace: FONT, color: MED_GREY, bold: true,
    });
    contentY += 0.25;
    const inspHeader = ['Location', 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
    const inspRows = inspByQ.map((r) => {
      const vals = [Number(r.q1) || 0, Number(r.q2) || 0, Number(r.q3) || 0, Number(r.q4) || 0];
      const annual = r.annual ? String(r.annual) : String(vals.reduce((a, b) => a + b, 0));
      return [r.location, ...vals.map(String), annual];
    });
    addBrandedTable(slide, [inspHeader, ...inspRows], { y: contentY, w: CONTENT_W });
    contentY += (inspRows.length + 1) * 0.35 + 0.2;
  } else if (incidents.length) {
    // Recordables only
    slide.addText('RECORDABLE INCIDENTS BY QUARTER', {
      x: MARGIN, y: contentY, w: CONTENT_W, h: 0.25,
      fontSize: 9, fontFace: FONT, color: MED_GREY, bold: true,
    });
    contentY += 0.25;
    const headerRow = ['Location', 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
    const dataRows = incidents.map((r) => {
      const vals = [Number(r.q1) || 0, Number(r.q2) || 0, Number(r.q3) || 0, Number(r.q4) || 0];
      const annual = r.annual ? String(r.annual) : String(vals.reduce((a, b) => a + b, 0));
      return [r.location, ...vals.map(String), annual];
    });
    addBrandedTable(slide, [headerRow, ...dataRows], { y: contentY, w: CONTENT_W });
    contentY += (dataRows.length + 1) * 0.35 + 0.2;
  }

  // Good Saves — callout with hazard topic details
  const saves = (form.safety.goodSaves || []).filter((r) => r.location || r.hazard);
  if (saves.length && contentY + 0.5 <= LOGO_SAFE_Y) {
    const saveLines = saves.map((r) => {
      const parts = [r.location, r.hazard].filter(Boolean).join(': ');
      const action = [r.action, r.notified ? `Notified: ${r.notified}` : ''].filter(Boolean).join('. ');
      return action ? `${parts} \u2014 ${action}` : parts;
    });
    const calloutH = Math.min(0.8, LOGO_SAFE_Y - contentY);
    addCalloutBox(slide, {
      x: MARGIN, y: contentY, w: CONTENT_W, h: calloutH,
      label: `Good Save${saves.length > 1 ? 's' : ''} (${saves.length}):`,
      text: saveLines.join('\n'),
      fontSize: 8,
    });
    contentY += calloutH + 0.1;
  }

  // Recordable Details — only if room
  const details = (form.safety.incidentDetails || []).filter((r) =>
    r.location && r.cause && r.cause !== 'Description/Cause' && r.cause.length > 3
  );
  if (details.length && contentY + 0.5 <= LOGO_SAFE_Y) {
    const detailText = details.map((r) =>
      `${r.location} (${r.date}): ${r.cause}. Treatment: ${r.treatment}. RTW: ${r.returnDate}.`
    ).join('\n');
    const calloutH = Math.min(0.7, LOGO_SAFE_Y - contentY);
    addCalloutBox(slide, {
      x: MARGIN, y: contentY, w: CONTENT_W, h: calloutH,
      label: 'Recordable Details:',
      text: detailText,
      fontSize: 8,
    });
  }

  const notesA2 = getNarrativeText(narratives, 'NOTES:A2');
  if (notesA2) slide.addNotes(notesA2);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 5: B.1 Executive Summary ──────────────────────

function addExecutiveSummarySlide(pptx, form, logoColor, narratives) {
  const e = form.executive;
  const cardY = 1.15;
  const gap = 0.3;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.8; // space for card header + padding above bullets
  const availBulletH = maxCardH - headerPad;

  // Build fallback bullets from other sections when exec summary is empty
  let achievements = getNarrativeLines(narratives, 'B1:ACHIEVEMENTS') || (e.achievements || []).filter(Boolean);
  let challenges = getNarrativeLines(narratives, 'B1:CHALLENGES') || (e.challenges || []).filter(Boolean);
  // Only show innovations if the intake form actually has G.1 innovation data
  const hasFormInnovations = (form.roadmap?.highlights || []).some(h => h.innovation);
  let innovations = hasFormInnovations
    ? (getNarrativeLines(narratives, 'B1:INNOVATIONS') || (e.innovations || []).filter(Boolean))
    : [];

  // Fallback: synthesize from available form data when agent didn't produce content
  if (!achievements.length) {
    const fb = [];
    const projCount = (form.projects?.completed || []).filter(p => p.description).length;
    if (projCount) fb.push(`Completed ${projCount} project${projCount > 1 ? 's' : ''} across campus facilities this quarter`);
    const recCount = form.safety?.recordableCount;
    if (recCount === '0' || recCount === 0) fb.push('Maintained zero recordable incidents — strong safety culture');
    const evtText = form.workTickets?.eventsSupported;
    if (evtText) {
      const evtCount = evtText.split('\n').filter(Boolean).length;
      if (evtCount) fb.push(`Supported ${evtCount} campus event${evtCount > 1 ? 's' : ''} this quarter`);
    }
    if (fb.length) achievements = fb;
  }
  if (!challenges.length) {
    const chItems = (form.challenges?.items || []).filter(r => r.challenge);
    if (chItems.length) challenges = chItems.slice(0, 2).map(r => `${r.challenge}${r.location ? ` (${r.location})` : ''}`);
  }
  // No fallback for innovations — if none provided, render 2-column layout

  // Hard truncation: cap exec summary bullets for consistent layout
  const capWords = (arr, max) => arr.map(t => {
    const w = t.split(/\s+/);
    return w.length > max ? w.slice(0, max).join(' ') : t;
  });
  achievements = capWords(achievements, 15);
  challenges = capWords(challenges, 15);
  innovations = capWords(innovations, 15);

  // Determine layout: 2-column (no innovations) vs 3-column
  const hasInnovations = innovations.length > 0;
  const colW = hasInnovations ? COL3_W : COL2_W;
  const cols = [
    { title: 'KEY ACHIEVEMENTS', items: achievements, color: AA_BLUE },
    { title: 'STRATEGIC CHALLENGES', items: challenges, color: AMBER },
  ];
  if (hasInnovations) {
    cols.push({ title: 'INNOVATION MILESTONES', items: innovations, color: GREEN });
  }

  // Always render on a single slide — reduce font size to fit if needed
  const maxBulletH = Math.max(...cols.map((c) => estimateBulletH(c.items, colW - 0.5)));
  let bulletFontSize = 10;
  if (maxBulletH > availBulletH) bulletFontSize = 9;
  if (maxBulletH > availBulletH * 1.3) bulletFontSize = 8;

  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Executive Summary');

  const slideBulletH = Math.max(...cols.map((c) => estimateBulletH(c.items, colW - 0.5)));
  const cardH = Math.min(slideBulletH + headerPad, maxCardH);

  cols.forEach((col, i) => {
    const x = MARGIN + i * (colW + gap);
    addCard(slide, { x, y: cardY, w: colW, h: cardH, borderColor: col.color, borderSide: 'top' });
    slide.addText(col.title, {
      x: x + 0.15, y: cardY + 0.15, w: colW - 0.3, h: 0.3,
      fontSize: 10, fontFace: FONT, color: DARK, bold: true,
    });
    if (col.items.length) {
      slide.addText(
        col.items.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
        {
          x: x + 0.25, y: cardY + 0.6, w: colW - 0.5, h: cardH - headerPad,
          fontSize: bulletFontSize, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
          valign: 'top',
        }
      );
    }
  });

  const notesB1 = getNarrativeText(narratives, 'NOTES:B1');
  if (notesB1) slide.addNotes(notesB1);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 6: C.1 Operational Performance — Work Tickets ─

function addWorkTicketsSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Operational Performance \u2014 Work Tickets');

  let contentY = 1.15;

  // Quarterly work tickets table (v2 layout)
  const ticketsByQ = (form.workTickets.ticketsByQuarter || []).filter(r => r.location);
  if (ticketsByQ.length) {
    slide.addText('WORK TICKETS BY QUARTER', {
      x: MARGIN, y: contentY, w: CONTENT_W, h: 0.3,
      fontSize: 9, fontFace: FONT, color: MED_GREY, bold: true,
    });
    contentY += 0.3;

    const qHeader = ['Location', 'Q1', 'Q2', 'Q3', 'Q4', 'YTD'];
    const qRows = ticketsByQ.map((r) => {
      const vals = [Number(r.q1) || 0, Number(r.q2) || 0, Number(r.q3) || 0, Number(r.q4) || 0];
      const ytd = r.ytd ? String(r.ytd) : String(vals.reduce((a, b) => a + b, 0));
      return [r.location, ...vals.map(String), ytd];
    });
    const qTotals = [0, 0, 0, 0, 0];
    qRows.forEach((row) => {
      for (let i = 1; i <= 5; i++) qTotals[i - 1] += Number(row[i]) || 0;
    });
    qRows.push(['TOTAL', ...qTotals.map(String)]);

    addBrandedTable(slide, [qHeader, ...qRows], { y: contentY, w: CONTENT_W });
    contentY += (qRows.length + 1) * 0.35 + 0.15;
  }

  // YoY comparison table
  const locs = (form.workTickets.locations || []).filter((r) => r.location);
  if (locs.length) {
    const q = form.cover.quarter || '';
    const yearMatch = q.match(/\d{4}/);
    const priorLabel = yearMatch
      ? q.replace(yearMatch[0], String(Number(yearMatch[0]) - 1))
      : q ? `${q} (Prior Year)` : 'Prior Year';

    const hasPriorYear = locs.some((r) => r.priorYear && String(r.priorYear).trim() !== '');

    if (ticketsByQ.length) {
      slide.addText('YoY COMPARISON', {
        x: MARGIN, y: contentY, w: CONTENT_W, h: 0.3,
        fontSize: 9, fontFace: FONT, color: MED_GREY, bold: true,
      });
      contentY += 0.3;
    }

    const headerRow = hasPriorYear
      ? ['Location', `${q || 'Q#'} (Prior Year)`, q || 'Current', 'Change']
      : ['Location', q || 'Current'];
    const dataRows = locs.map((r) => {
      const current = Number(r.currentYear) || 0;
      if (!hasPriorYear) return [r.location, String(current)];
      const prior = Number(r.priorYear) || 0;
      const pct = prior ? (((current - prior) / prior) * 100).toFixed(1) + '%' : '\u2014';
      return [r.location, String(prior), String(current), pct];
    });
    const totalCurrent = locs.reduce((s, r) => s + (Number(r.currentYear) || 0), 0);
    if (hasPriorYear) {
      const totalPrior = locs.reduce((s, r) => s + (Number(r.priorYear) || 0), 0);
      const totalPct = totalPrior ? (((totalCurrent - totalPrior) / totalPrior) * 100).toFixed(1) + '%' : '\u2014';
      dataRows.push(['TOTAL', String(totalPrior), String(totalCurrent), totalPct]);
    } else {
      dataRows.push(['TOTAL', String(totalCurrent)]);
    }

    addBrandedTable(slide, [headerRow, ...dataRows], { y: contentY });
    contentY += (dataRows.length + 1) * 0.35 + 0.3;
  }

  // Key Takeaway callout — only if there's room above the logo
  const takeawayText = getNarrativeText(narratives, 'C1:TAKEAWAY') || form.workTickets.keyTakeaway;
  const tableBottom = ticketsByQ.length ? contentY : 1.15 + ((locs.length + 2) * 0.35) + 0.3;
  if (takeawayText && tableBottom + 0.85 <= LOGO_SAFE_Y) {
    addCalloutBox(slide, {
      x: MARGIN, y: tableBottom, w: CONTENT_W, h: 0.85,
      label: 'Key Takeaway:', text: takeawayText,
    });
  }

  // Events Supported — try to fit on same slide, otherwise separate slide with 2 columns
  if (form.workTickets.eventsSupported) {
    const evText = form.workTickets.eventsSupported;
    const events = evText.split('\n').filter(Boolean);
    const evY = takeawayText ? tableBottom + 1.0 : tableBottom;
    const maxEvH = SLIDE_H - evY - 0.35;
    const neededH = events.length * 0.2 + 0.3;

    if (neededH <= maxEvH && events.length <= 8) {
      // Fits on same slide
      const evH = Math.max(0.85, Math.min(neededH, maxEvH));
      addCalloutBox(slide, {
        x: MARGIN, y: evY, w: CONTENT_W, h: evH,
        label: 'Events Supported:', text: evText,
        fontSize: events.length > 10 ? 7 : 8,
      });
    } else {
      // Separate slide with 2-column layout
      addLogoBottomRight(slide, logoColor);
      const evSlide = pptx.addSlide();
      setContentBackground(evSlide);
      addSectionTitle(evSlide, 'Events Supported');

      const mid = Math.ceil(events.length / 2);
      const col1 = events.slice(0, mid);
      const col2 = events.slice(mid);
      const evCardY = 1.15;
      const evCardH = Math.min(events.length * 0.12 + 1.0, 3.8);
      const evFs = events.length > 20 ? 9 : 10;

      // Left column
      addCard(evSlide, { x: MARGIN, y: evCardY, w: COL2_W, h: evCardH, borderColor: AA_BLUE, borderSide: 'top' });
      evSlide.addText(
        col1.map(e => ({ text: e, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 3 } })),
        { x: MARGIN + 0.2, y: evCardY + 0.15, w: COL2_W - 0.4, h: evCardH - 0.3, fontSize: evFs, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.2 }
      );

      // Right column
      addCard(evSlide, { x: MARGIN + COL2_W + 0.3, y: evCardY, w: COL2_W, h: evCardH, borderColor: AA_BLUE, borderSide: 'top' });
      if (col2.length) {
        evSlide.addText(
          col2.map(e => ({ text: e, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 3 } })),
          { x: MARGIN + COL2_W + 0.5, y: evCardY + 0.15, w: COL2_W - 0.4, h: evCardH - 0.3, fontSize: evFs, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.2 }
        );
      }

      addLogoBottomRight(evSlide, logoColor);
      return; // Already added logo to both slides
    }
  }

  const notesC1 = getNarrativeText(narratives, 'NOTES:C1');
  if (notesC1) slide.addNotes(notesC1);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 7: C.2 Audits and Corrective Actions ─────────

function addAuditsSlide(pptx, form, logoColor, narratives) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Operational Audits and Corrective Actions');

  const a = form.audits;
  // Only include columns that have a real location name (not placeholders like "Location 3")
  const activeIndices = (a.locationNames || []).map((n, i) => n ? i : -1).filter((i) => i >= 0);
  const names = activeIndices.map((i) => a.locationNames[i]);
  // Filter out placeholder names that have no data in any row
  const realIndices = activeIndices.filter((i) => {
    const hasAnyData = (Number(a.priorAudits[i]) || 0) + (Number(a.priorActions[i]) || 0)
      + (Number(a.currentAudits[i]) || 0) + (Number(a.currentActions[i]) || 0);
    return hasAnyData > 0 || !/^Location\s*\d+$/i.test(a.locationNames[i]);
  });
  const realNames = realIndices.map((i) => a.locationNames[i]);

  let tableRowCount = 1; // header
  if (realNames.length) {
    const sumActive = (arr) => String(realIndices.reduce((s, i) => s + (Number(arr[i]) || 0), 0));
    const headerRow = ['', ...realNames, 'Total'];
    const hasPriorData = realIndices.some(i => Number(a.priorAudits[i]) > 0 || Number(a.priorActions[i]) > 0);
    const rows = [
      headerRow,
      ...(hasPriorData ? [
        ['Prior Qtr Audits', ...realIndices.map((i) => String(a.priorAudits[i] || '')), sumActive(a.priorAudits)],
        ['Prior Qtr Actions', ...realIndices.map((i) => String(a.priorActions[i] || '')), sumActive(a.priorActions)],
      ] : []),
      ['Current Qtr Audits', ...realIndices.map((i) => String(a.currentAudits[i] || '')), sumActive(a.currentAudits)],
      ['Current Qtr Actions', ...realIndices.map((i) => String(a.currentActions[i] || '')), sumActive(a.currentActions)],
    ];
    tableRowCount = rows.length;
    addBrandedTable(slide, rows, { y: 1.15 });
  }

  // Audit & Action Analysis card below table
  // Always prefer agent analysis — it synthesizes the raw explanation text into a narrative
  const agentAnalysis = getNarrativeText(narratives, 'C2:ANALYSIS');
  const formExplanation = [a.auditExplanation, a.actionExplanation].filter(Boolean).join('\n\n');
  const analysisText = agentAnalysis || formExplanation;
  const cardY = 1.15 + (tableRowCount + 1) * 0.35 + 0.3;

  if (analysisText) {
    const cardH = SLIDE_H - cardY - 0.55;
    addCard(slide, { x: MARGIN, y: cardY, w: CONTENT_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });
    slide.addText('AUDIT & ACTION ANALYSIS', {
      x: MARGIN + 0.2, y: cardY + 0.1, w: CONTENT_W - 0.4, h: 0.25,
      fontSize: 11, fontFace: FONT, color: DARK, bold: true,
    });
    // Auto-scale font to fill available card space
    const textLen = analysisText.length;
    const fontSize = textLen > 600 ? 8 : textLen > 400 ? 9 : textLen > 250 ? 10 : 11;
    slide.addText(analysisText, {
      x: MARGIN + 0.2, y: cardY + 0.4, w: CONTENT_W - 0.4, h: cardH - 0.55,
      fontSize, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.3,
    });
  }

  const notesC2 = getNarrativeText(narratives, 'NOTES:C2');
  if (notesC2) slide.addNotes(notesC2);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 8: C.3 Top Action Areas (Charts) ──────────────

function addTopAreasSlide(pptx, form, logoColor, narratives) {
  const locations = form.audits.topAreaLocations || [];
  const hasMultiLocation = locations.length > 1;

  // Filter areas with data — check both single count and per-location values
  const areas = (form.audits.topAreas || []).filter((a) => {
    if (hasMultiLocation) return (a.values || []).some((v) => Number(v) > 0);
    return a.count;
  });
  if (!areas.length) return; // Skip slide entirely when no data

  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Top Action Areas');

  // All mid-tone colors so dark data-label text is always readable
  const chartColors = [AA_BLUE, '2ECC71', '48CAE4', 'F5A623', 'E74C3C', '95A5A6'];
  const q = form.cover.quarter || 'Current';

  if (hasMultiLocation) {
    // ── Multi-location: pie charts side by side (top) + shared legend + analysis (bottom) ──
    const pieW = COL2_W;
    const pieCardH = 2.1;
    const pieChartH = 1.75;

    // Render each location's pie chart side by side — no per-chart legend
    locations.forEach((loc, li) => {
      const px = MARGIN + li * (pieW + 0.3);
      addCard(slide, { x: px, y: 1.15, w: pieW, h: pieCardH });
      slide.addText(loc, {
        x: px + 0.15, y: 1.2, w: pieW - 0.3, h: 0.22,
        fontSize: 10, fontFace: FONT, color: DARK, bold: true, align: 'center',
      });
      const pieValues = areas.map((a) => Number((a.values || [])[li]) || 0);
      if (pieValues.some((v) => v > 0)) {
        slide.addChart(pptx.charts.PIE, [{
          name: loc,
          labels: areas.map((a) => a.area),
          values: pieValues,
        }], {
          x: px + 0.15, y: 1.45, w: pieW - 0.3, h: pieChartH,
          showPercent: true,
          showLegend: false,
          dataLabelFontSize: 8,
          chartColors: chartColors.slice(0, areas.length),
        });
      }
    });

    // Shared legend row centered below both pie cards
    const legendY = 1.15 + pieCardH + 0.08;
    const legendItems = areas.map((a, i) => ([
      { text: '\u25A0 ', options: { fontSize: 8, color: chartColors[i % chartColors.length], fontFace: FONT } },
      { text: `${a.area}   `, options: { fontSize: 7, color: MED_GREY, fontFace: FONT } },
    ])).flat();
    slide.addText(legendItems, {
      x: MARGIN, y: legendY, w: CONTENT_W, h: 0.2,
      align: 'center', valign: 'middle',
    });

    // Bottom: analysis card with bullets
    const analysisText = getNarrativeText(narratives, 'C3:TAKEAWAY') || '';
    if (analysisText) {
      const analysisY = legendY + 0.25;
      const analysisH = LOGO_SAFE_Y - analysisY;
      addCard(slide, { x: MARGIN, y: analysisY, w: CONTENT_W, h: analysisH, borderColor: AA_BLUE, borderSide: 'left' });
      slide.addText('KEY FINDINGS', {
        x: MARGIN + 0.2, y: analysisY + 0.08, w: CONTENT_W - 0.4, h: 0.22,
        fontSize: 10, fontFace: FONT, color: DARK, bold: true,
      });
      // Split into bullet points — by sentence or newline
      const bullets = analysisText.split(/(?<=[.!])\s+/).filter(Boolean).map(s => s.trim());
      slide.addText(
        bullets.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 3 } })),
        {
          x: MARGIN + 0.3, y: analysisY + 0.32, w: CONTENT_W - 0.5, h: analysisH - 0.4,
          fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.15,
        }
      );
    }
  } else {
    // ── Single location: pie chart (left) + explanation card (right) ──
    addCard(slide, { x: MARGIN, y: 1.15, w: COL2_W, h: 3.7 });
    slide.addText(`${q} Action Area Distribution`, {
      x: MARGIN + 0.15, y: 1.25, w: COL2_W - 0.3, h: 0.3,
      fontSize: 10, fontFace: FONT, color: DARK, bold: true, align: 'center',
    });

    slide.addChart(pptx.charts.PIE, [{
      name: 'Distribution',
      labels: areas.map((a) => a.area),
      values: areas.map((a) => Number(a.count) || 0),
    }], {
      x: MARGIN + 0.15, y: 1.6, w: COL2_W - 0.3, h: 2.8,
      showPercent: true,
      showLegend: true,
      legendPos: 'b',
      legendFontSize: 7,
      dataLabelFontSize: 8,
      chartColors: chartColors.slice(0, areas.length),
    });

    // Right side: explanation / analysis card
    const analysisText = getNarrativeText(narratives, 'C3:TAKEAWAY') || '';
    if (analysisText) {
      addCard(slide, { x: MARGIN + COL2_W + 0.3, y: 1.15, w: COL2_W, h: 3.7, borderColor: AA_BLUE, borderSide: 'left' });
      slide.addText('ANALYSIS', {
        x: MARGIN + COL2_W + 0.5, y: 1.25, w: COL2_W - 0.4, h: 0.25,
        fontSize: 10, fontFace: FONT, color: DARK, bold: true,
      });
      slide.addText(analysisText, {
        x: MARGIN + COL2_W + 0.5, y: 1.55, w: COL2_W - 0.4, h: 3.15,
        fontSize: 9, fontFace: FONT, color: DARK, valign: 'top', lineSpacingMultiple: 1.4,
      });
    }
  }

  // Key Takeaway callout at bottom — only when analysis wasn't shown in right card
  const narrativeTakeaway = getNarrativeText(narratives, 'C3:TAKEAWAY');
  if (!narrativeTakeaway) {
    const total = hasMultiLocation
      ? areas.reduce((s, a) => (a.values || []).reduce((vs, v) => vs + (Number(v) || 0), s), 0)
      : areas.reduce((s, a) => s + (Number(a.count) || 0), 0);
    if (total > 0) {
      addCalloutBox(slide, {
        x: MARGIN, y: 5.0, w: CONTENT_W, h: 0.5,
        label: 'Key Takeaway:',
        text: `${areas[0].area} accounts for the highest share of corrective actions this quarter.`,
      });
    }
  }

  const notesC3 = getNarrativeText(narratives, 'NOTES:C3');
  if (notesC3) slide.addNotes(notesC3);

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

  // Filter out "Events Supported" category — events are already on Work Tickets slide
  const eventsKey = Object.keys(categories).find(k => k.toLowerCase().includes('events supported'));
  if (eventsKey) delete categories[eventsKey];

  // Hard truncation: cap each bullet to 20 words for consistent layout
  for (const cat of Object.keys(categories)) {
    categories[cat] = categories[cat].map(text => {
      const words = text.split(/\s+/);
      return words.length > 20 ? words.slice(0, 20).join(' ') : text;
    });
  }

  if (!Object.keys(categories).length) {
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

  // Smart layout — max 2 columns (3 is too narrow for descriptive text)
  const allCatKeys = Object.keys(categories);
  const cardY = 1.15;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.55;

  // Helper: check if a set of categories fits on one slide at given cols/font
  function layoutFits(keys, cols, fontSize) {
    const colW = cols === 1 ? CONTENT_W : COL2_W;
    const scale = fontSize / 10;
    const tallest = Math.max(...keys.map(k => estimateBulletH(categories[k], colW - 0.5) * scale));
    return tallest + headerPad <= maxCardH;
  }

  // Render one projects slide with given categories and font
  // Returns any keys that didn't fit (for overflow to next slide)
  function renderProjectsSlide(keys, slideTitle, fontSize) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, slideTitle);

    // Always try 2-column layout first when 2+ categories
    let cols = Math.min(keys.length, 2);
    let fs = fontSize;

    // Shrink font to fit in 2-column layout before dropping to 1 column
    if (cols > 1 && !layoutFits(keys, cols, fs)) fs = Math.max(8, fs - 1);
    if (cols > 1 && !layoutFits(keys, cols, fs)) fs = Math.max(7.5, fs - 0.5);
    if (cols > 1 && !layoutFits(keys, cols, fs)) fs = Math.max(7, fs - 0.5);

    // If still doesn't fit at 2 cols, render only the first category full-width
    // and return the rest for a new slide
    if (cols > 1 && !layoutFits(keys, cols, fs)) {
      cols = 1;
      fs = fontSize;
      if (!layoutFits([keys[0]], 1, fs)) fs = Math.max(7.5, fs - 1);
      if (!layoutFits([keys[0]], 1, fs)) fs = Math.max(7, fs - 0.5);
    }

    const renderKeys = cols === 1 && keys.length > 1 ? [keys[0]] : keys;
    const overflow = cols === 1 && keys.length > 1 ? keys.slice(1) : [];

    const colW = cols === 1 ? CONTENT_W : COL2_W;
    const scale = fs / 10;
    const tallest = Math.max(...renderKeys.map(k => estimateBulletH(categories[k], colW - 0.5) * scale));
    const cardH = Math.min(tallest + headerPad, maxCardH);
    const ls = fs <= 8.5 ? 1.1 : 1.2;

    renderKeys.forEach((cat, i) => {
      const x = MARGIN + i * (colW + 0.3);
      addCard(slide, { x, y: cardY, w: colW, h: cardH, borderColor: AA_BLUE, borderSide: 'top' });
      slide.addText(cat.toUpperCase(), {
        x: x + 0.15, y: cardY + 0.12, w: colW - 0.3, h: 0.25,
        fontSize: 9, fontFace: FONT, color: DARK, bold: true,
      });
      if (categories[cat].length) {
        addCardBullets(slide, categories[cat], {
          x, y: cardY + 0.4, w: colW, h: cardH - 0.5,
          fontSize: fs, lineSpacing: ls,
        });
      }
    });

    if (slideTitle === 'Completed Projects Showcase') {
      const notesD1 = getNarrativeText(narratives, 'NOTES:D1');
      if (notesD1) slide.addNotes(notesD1);
    }
    addLogoBottomRight(slide, logoColor);
    return overflow;
  }

  // Determine font size based on total content volume
  const totalItems = allCatKeys.reduce((s, k) => s + categories[k].length, 0);
  let bulletFs = 9;
  if (totalItems > 10) bulletFs = 8;
  if (totalItems > 16) bulletFs = 7.5;

  // Try to fit on 1 slide (max 2 columns), overflow handled by renderProjectsSlide
  if (allCatKeys.length <= 2 && layoutFits(allCatKeys, allCatKeys.length, bulletFs)) {
    renderProjectsSlide(allCatKeys, 'Completed Projects Showcase', bulletFs);
  } else {
    // Split categories across slides, 2 per slide max
    let remaining = [...allCatKeys];
    let slideNum = 0;
    while (remaining.length > 0) {
      const batch = remaining.splice(0, 2);
      const title = slideNum === 0 ? 'Completed Projects Showcase' : 'Completed Projects Showcase (cont.)';
      const overflow = renderProjectsSlide(batch, title, bulletFs);
      if (overflow.length) remaining.unshift(...overflow);
      slideNum++;
    }
  }
}

// ── Slide 10: D.2 Project Photos ────────────────────────

/** Pair before/after photos by matching captions (case-insensitive) */
function pairBeforeAfterPhotos(photos) {
  const befores = photos.filter(p => p.type === 'before');
  const afters = photos.filter(p => p.type === 'after');
  const generals = photos.filter(p => !p.type || p.type === 'general');
  const pairs = [];
  const unmatchedAfters = [...afters];

  for (const b of befores) {
    const key = (b.caption || b.location || '').toLowerCase().trim();
    const matchIdx = unmatchedAfters.findIndex(a =>
      (a.caption || a.location || '').toLowerCase().trim() === key
    );
    if (matchIdx >= 0) {
      pairs.push({ before: b, after: unmatchedAfters.splice(matchIdx, 1)[0] });
    } else {
      generals.push(b); // No match — treat as general
    }
  }
  generals.push(...unmatchedAfters); // Unmatched afters also become general
  return { pairs, singles: generals };
}

/** Render a before/after pair slide — left = BEFORE, right = AFTER */
async function addBeforeAfterSlide(pptx, pair, title, logoColor) {
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, title);

  for (let j = 0; j < 2; j++) {
    const photo = j === 0 ? pair.before : pair.after;
    const label = j === 0 ? 'BEFORE' : 'AFTER';
    const base64 = await resolvePhotoData(photo);
    if (!base64) continue;
    const xPos = j === 0 ? MARGIN : MARGIN + COL2_W + 0.3;

    // Label above image
    slide.addText(label, {
      x: xPos, y: 1.0, w: COL2_W, h: 0.3,
      fontSize: 10, fontFace: FONT, color: j === 0 ? MED_GREY : AA_BLUE, bold: true, align: 'center',
    });

    // Card frame
    addCard(slide, { x: xPos, y: 1.3, w: COL2_W, h: 3.65 });
    slide.addImage({
      data: base64, x: xPos + 0.15, y: 1.45, w: COL2_W - 0.3, h: 2.85,
      rounding: false, rectRadius: 0.1,
    });

    const caption = [photo.caption, photo.location].filter(Boolean).join(' \u2014 ') || photo.name;
    slide.addText(caption, {
      x: xPos + 0.15, y: 4.4, w: COL2_W - 0.3, h: 0.4,
      fontSize: 9, fontFace: FONT, color: MED_GREY, align: 'center', italic: true,
    });
  }

  addLogoBottomRight(slide, logoColor);
}

/** Resolve photo image data — handles File objects, storage paths, and legacy base64 */
async function resolvePhotoData(photo) {
  if (photo.file instanceof File) return fileToBase64(photo.file);
  if (photo.storagePath) return getPhotoAsBase64(photo.storagePath);
  if (photo.base64) return photo.base64;
  return null;
}

async function addPhotoSlides(pptx, form, logoColor) {
  const photos = form.projects?.photos || [];
  const withData = photos.filter((p) => p.file instanceof File || p.base64);
  if (!withData.length) return; // Skip photo slides entirely when no photos

  const { pairs, singles } = pairBeforeAfterPhotos(withData);

  // Render before/after pairs first — one pair per slide
  for (let i = 0; i < pairs.length; i++) {
    const title = i === 0 && !singles.length
      ? 'Completed Projects \u2014 Photos'
      : i === 0 ? 'Completed Projects \u2014 Before & After' : 'Completed Projects \u2014 Before & After (cont.)';
    await addBeforeAfterSlide(pptx, pairs[i], title, logoColor);
  }

  // Render remaining singles — 2 per slide
  for (let i = 0; i < singles.length; i += 2) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, pairs.length > 0 || i > 0
      ? 'Completed Projects \u2014 Photos (cont.)'
      : 'Completed Projects \u2014 Photos');

    for (let j = 0; j < 2 && i + j < singles.length; j++) {
      const photo = singles[i + j];
      const base64 = await resolvePhotoData(photo);
      if (!base64) continue;
      const xPos = j === 0 ? MARGIN : MARGIN + COL2_W + 0.3;

      // Card frame
      addCard(slide, { x: xPos, y: 1.15, w: COL2_W, h: 3.8 });
      slide.addImage({
        data: base64, x: xPos + 0.15, y: 1.3, w: COL2_W - 0.3, h: 3.0,
        rounding: false, rectRadius: 0.1,
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
    // Parse "location | event | quote | attribution" or "location | quote | attribution" lines from agent
    testimonials = narrativeLines.map((line) => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        return { location: parts[0], event: parts[1], quote: parts[2], attribution: parts[3] };
      } else if (parts.length >= 3) {
        return { location: parts[0], quote: parts[1], attribution: parts[2], event: '' };
      } else if (parts.length === 2) {
        return { quote: parts[0], attribution: parts[1], location: '', event: '' };
      }
      return { quote: line, attribution: '', location: '', event: '' };
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

  // Estimate each testimonial's needed height
  function estimateTestimonialH(t) {
    const chars = (t.quote || '').length;
    const charsPerLine = Math.floor((CONTENT_W - 0.6) * 11);
    const lines = Math.max(1, Math.ceil(chars / charsPerLine));
    const locH = t.location ? 0.25 : 0;
    const attrH = t.attribution ? 0.3 : 0;
    return locH + lines * 0.2 + attrH + 0.25;
  }

  // Paginate testimonials — fit as many as possible per slide
  const availableH = LOGO_SAFE_Y - 1.15;
  const gapH = 0.15;
  const pages = [];
  let currentPage = [];
  let pageH = 0;

  for (const t of testimonials) {
    const tH = estimateTestimonialH(t);
    if (currentPage.length > 0 && pageH + gapH + tH > availableH) {
      pages.push(currentPage);
      currentPage = [t];
      pageH = tH;
    } else {
      currentPage.push(t);
      pageH += (currentPage.length > 1 ? gapH : 0) + tH;
    }
  }
  if (currentPage.length) pages.push(currentPage);

  pages.forEach((pageItems, pageIdx) => {
    const pageSlide = pageIdx === 0 ? slide : pptx.addSlide();
    if (pageIdx > 0) {
      setContentBackground(pageSlide);
      addSectionTitle(pageSlide, 'Service & Client Satisfaction (cont.)');
    }

    let currentY = 1.15;
    pageItems.forEach((t) => {
      const cardH = Math.max(0.8, estimateTestimonialH(t));
      addCard(pageSlide, { x: MARGIN, y: currentY, w: CONTENT_W, h: cardH, borderColor: AA_BLUE, borderSide: 'left' });

      const loc = t.location || '';
      const evt = t.event || '';
      const locLine = [loc, evt].filter(Boolean).join(' — ');
      let textY = currentY + 0.08;
      if (locLine) {
        pageSlide.addText(locLine.toUpperCase(), {
          x: MARGIN + 0.2, y: textY, w: CONTENT_W - 0.4, h: 0.2,
          fontSize: 9, fontFace: FONT, color: AA_BLUE, bold: true,
        });
        textY += 0.22;
      }

      const quoteH = cardH - (textY - currentY) - (t.attribution ? 0.3 : 0.1);
      pageSlide.addText(`\u201C${t.quote}\u201D`, {
        x: MARGIN + 0.2, y: textY, w: CONTENT_W - 0.4, h: Math.max(0.3, quoteH),
        fontSize: 10, fontFace: FONT, color: MED_GREY, italic: true, valign: 'top',
        lineSpacingMultiple: 1.2,
      });

      if (t.attribution) {
        pageSlide.addText(`\u2014 ${t.attribution}`, {
          x: MARGIN + 0.2, y: currentY + cardH - 0.28, w: CONTENT_W - 0.4, h: 0.25,
          fontSize: 9, fontFace: FONT, color: DARK, bold: true,
        });
      }

      currentY += cardH + gapH;
    });

    if (pageIdx === 0) {
      const notesD3 = getNarrativeText(narratives, 'NOTES:D3');
      if (notesD3) pageSlide.addNotes(notesD3);
    }
    addLogoBottomRight(pageSlide, logoColor);
  });
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

  // Hard truncation: cap bullets to 25 words for consistent layout
  const truncate = (arr, max) => arr.map(t => {
    const w = t.split(/\s+/);
    return w.length > max ? w.slice(0, max).join(' ') : t;
  });
  allChallengeTexts = truncate(allChallengeTexts, 25);
  allActionTexts = truncate(allActionTexts, 25);

  // Always render on ONE slide — shrink font if needed to fit
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, 'Addressing Key Operational Challenges');

  const cardY = 1.15;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.55;
  const x1 = MARGIN;
  const x2 = MARGIN + COL2_W + 0.3;
  const cardH = maxCardH;

  // Scale font based on item count and available space
  const itemCount = allChallengeTexts.length;
  const totalChars = Math.max(...[allChallengeTexts, allActionTexts].map(a => a.join(' ').length));
  const bulletFontSize = itemCount > 7 ? 8 : itemCount > 6 ? 9 : totalChars > 500 ? 9.5 : 11;
  const bulletSpacing = itemCount > 5 ? 1.15 : 1.3;

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
  if (allChallengeTexts.length) {
    addCardBullets(slide, allChallengeTexts, { x: x1, y: cardY + 0.55, w: COL2_W, h: cardH - headerPad, fontSize: bulletFontSize, lineSpacing: bulletSpacing });
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
  if (allActionTexts.length) {
    addCardBullets(slide, allActionTexts, { x: x2, y: cardY + 0.55, w: COL2_W, h: cardH - headerPad, fontSize: bulletFontSize, lineSpacing: bulletSpacing });
  }

  const notesE1 = getNarrativeText(narratives, 'NOTES:E1');
  if (notesE1) slide.addNotes(notesE1);

  addLogoBottomRight(slide, logoColor);
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

  // Color by aging bucket: 1-30 green, 31-60 green, 61-90 amber, 91+ red
  const bucketColors = [GREEN, GREEN, AMBER, AA_RED];

  const agingRows = bucketData.map((row, ri) =>
    row.map((cell, ci) => ({
      text: String(cell),
      options: ri === 0
        ? { bold: true, fontSize: 9, fontFace: FONT, color: DARK, align: ci === 0 ? 'left' : 'right' }
        : {
            fontSize: 10, fontFace: FONT, align: ci === 0 ? 'left' : 'right',
            color: ci === 1 ? bucketColors[ri - 1] : DARK,
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
  let notes = strategyNarrative || (f.strategyNotes || []).filter(Boolean);
  // Fallback: generate basic strategy from aging data when agent didn't produce content
  if (!notes.length && f.totalOutstanding) {
    const fb = [];
    const total = parseFloat(String(f.totalOutstanding).replace(/[$,]/g, '')) || 0;
    const b30 = parseFloat(String(f.bucket30).replace(/[$,]/g, '')) || 0;
    const b60 = parseFloat(String(f.bucket60).replace(/[$,]/g, '')) || 0;
    const b90 = parseFloat(String(f.bucket90).replace(/[$,]/g, '')) || 0;
    const b91 = parseFloat(String(f.bucket91).replace(/[$,]/g, '')) || 0;
    if (total > 0) {
      const pct30 = ((b30 / total) * 100).toFixed(0);
      const pct60 = (((b30 + b60) / total) * 100).toFixed(0);
      fb.push(`${pct60}% of outstanding balance within 60 days — standard payment processing`);
      if (b90 > 0) fb.push(`${fmtCurrency(b90)} in 61-90 day range requires follow-up with accounts payable`);
      if (b91 > 0) fb.push(`${fmtCurrency(b91)} aged 91+ days — escalate collection efforts`);
      else fb.push('No balances past 90 days — strong collection performance');
      fb.push('Continue proactive invoice follow-up to maintain aging profile');
    }
    notes = fb;
  }
  if (notes.length) {
    // Clip to items that fit within the card to prevent overflow
    const availH = cardH - 0.8;
    const bulletColW = COL2_W - 0.5;
    const fittingPages = splitItemsToFit(notes, availH, bulletColW);
    addCardBullets(slide, fittingPages[0], { x: x2, y: cardY + 0.6, w: COL2_W, h: availH });
  }

  const notesF1 = getNarrativeText(narratives, 'NOTES:F1');
  if (notesF1) slide.addNotes(notesF1);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 14: G.1 Innovation & Technology Integration ───

// ── Slide G.1a: Innovation Photos ────────────────────────

async function addInnovationPhotoSlides(pptx, form, logoColor) {
  const photos = form.roadmap?.photos || [];
  const withData = photos.filter((p) => p.file instanceof File || p.base64);
  if (!withData.length) return; // Skip when no innovation photos

  const { pairs, singles } = pairBeforeAfterPhotos(withData);

  // Render before/after pairs first — one pair per slide
  for (let i = 0; i < pairs.length; i++) {
    const title = i === 0 && !singles.length
      ? 'Innovation & Technology \u2014 Photos'
      : i === 0 ? 'Innovation & Technology \u2014 Before & After' : 'Innovation & Technology \u2014 Before & After (cont.)';
    await addBeforeAfterSlide(pptx, pairs[i], title, logoColor);
  }

  // Render remaining singles — 2 per slide
  for (let i = 0; i < singles.length; i += 2) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, pairs.length > 0 || i > 0
      ? 'Innovation & Technology \u2014 Photos (cont.)'
      : 'Innovation & Technology \u2014 Photos');

    for (let j = 0; j < 2 && i + j < singles.length; j++) {
      const photo = singles[i + j];
      const base64 = await resolvePhotoData(photo);
      if (!base64) continue;
      const xPos = j === 0 ? MARGIN : MARGIN + COL2_W + 0.3;

      addCard(slide, { x: xPos, y: 1.15, w: COL2_W, h: 3.8 });
      slide.addImage({
        data: base64, x: xPos + 0.15, y: 1.3, w: COL2_W - 0.3, h: 3.0,
        rounding: false, rectRadius: 0.1,
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

function addInnovationSlide(pptx, form, logoColor, narratives) {
  const rawHighlights = (form.roadmap.highlights || []).filter((h) => h.innovation);
  if (!rawHighlights.length) return; // Skip slide entirely when no data

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

  // Render in batches — try 3 per slide, reduce if overflow, split single-card items if needed
  const cardY = 1.15;
  const gap = 0.3;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.8;
  let hIdx = 0;
  let slideNum = 0;

  while (hIdx < highlights.length) {
    // Try fitting 3, then 2, then 1 on a slide
    let batchSize = Math.min(3, highlights.length - hIdx);
    let fits = false;

    while (batchSize >= 1) {
      const batchItems = highlights.slice(hIdx, hIdx + batchSize);
      const colW = batchSize === 1 ? CONTENT_W : batchSize === 2 ? COL2_W : COL3_W;
      const tallest = Math.max(...batchItems.map((h) => estimateBulletH(h.bullets, colW - 0.5)));
      fits = tallest + headerPad <= maxCardH;
      if (fits) break;
      batchSize--;
    }
    if (batchSize < 1) batchSize = 1;

    const batchItems = highlights.slice(hIdx, hIdx + batchSize);
    const colW = batchSize === 1 ? CONTENT_W : batchSize === 2 ? COL2_W : COL3_W;
    const colGap = batchSize === 2 ? 0.3 : gap;

    // Single innovation that overflows — split its bullets across pages
    if (batchSize === 1 && !fits) {
      const h = batchItems[0];
      const availBulletH = maxCardH - headerPad;
      const bulletPages = splitItemsToFit(h.bullets, availBulletH, colW - 0.5);

      for (let p = 0; p < bulletPages.length; p++) {
        const slide = pptx.addSlide();
        setContentBackground(slide);
        addSectionTitle(slide, slideNum === 0 && p === 0
          ? 'Innovation & Technology Integration'
          : 'Innovation & Technology Integration (cont.)');

        const pageItems = bulletPages[p];
        const bulletH = estimateBulletH(pageItems, colW - 0.5);
        const pageCardH = Math.min(bulletH + headerPad, maxCardH);

        addCard(slide, { x: MARGIN, y: cardY, w: colW, h: pageCardH, borderColor: AA_BLUE, borderSide: 'top' });
        slide.addText((h.innovation || '').toUpperCase(), {
          x: MARGIN + 0.15, y: cardY + 0.15, w: colW - 0.3, h: 0.3,
          fontSize: 10, fontFace: FONT, color: DARK, bold: true,
        });
        if (pageItems.length) {
          addCardBullets(slide, pageItems, { x: MARGIN, y: cardY + 0.6, w: colW, h: pageCardH - headerPad });
        }
        if (slideNum === 0 && p === 0) {
          const notesG1 = getNarrativeText(narratives, 'NOTES:G1');
          if (notesG1) slide.addNotes(notesG1);
        }
        addLogoBottomRight(slide, logoColor);
        slideNum++;
      }
    } else {
      // Normal case — batch fits on one slide
      const slide = pptx.addSlide();
      setContentBackground(slide);
      addSectionTitle(slide, slideNum === 0
        ? 'Innovation & Technology Integration'
        : 'Innovation & Technology Integration (cont.)');

      const maxBulletH = Math.max(...batchItems.map((h) => estimateBulletH(h.bullets, colW - 0.5)));
      const cardH = Math.min(maxBulletH + headerPad, maxCardH);

      batchItems.forEach((h, i) => {
        const x = MARGIN + i * (colW + colGap);
        addCard(slide, { x, y: cardY, w: colW, h: cardH, borderColor: AA_BLUE, borderSide: 'top' });
        slide.addText((h.innovation || '').toUpperCase(), {
          x: x + 0.15, y: cardY + 0.15, w: colW - 0.3, h: 0.3,
          fontSize: 10, fontFace: FONT, color: DARK, bold: true,
        });
        if (h.bullets.length) {
          addCardBullets(slide, h.bullets, { x, y: cardY + 0.6, w: colW, h: cardH - headerPad });
        }
      });

      if (slideNum === 0) {
        const notesG1 = getNarrativeText(narratives, 'NOTES:G1');
        if (notesG1) slide.addNotes(notesG1);
      }
      addLogoBottomRight(slide, logoColor);
      slideNum++;
    }

    hIdx += batchSize;
  }
}

// ── Slide 15: G.2 Roadmap — Strategic Initiatives ───────

function addRoadmapSlide(pptx, form, logoColor, narratives) {
  const r = form.roadmap;
  const q = form.cover.quarter || '';
  const nextQ = q ? q.replace(/Q(\d)/, (_, n) => `Q${(Number(n) % 4) + 1}`) : '';
  const titleBase = `${nextQ ? nextQ + ' ' : ''}Roadmap \u2014 Strategic Initiatives`;

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

  // Detect when all initiative names are the same (shared category) — swap with details
  if (schedule.length > 1) {
    const initiatives = schedule.map(s => (s.initiative || '').trim().toLowerCase());
    const unique = new Set(initiatives);
    if (unique.size === 1 && schedule[0].initiative) {
      // All rows share the same category — use details as initiative name
      schedule = schedule.map(s => ({
        month: s.month,
        initiative: s.details || s.initiative,
        details: '',
      }));
    }
  }

  // Always render on ONE slide — use a compact table layout
  const slide = pptx.addSlide();
  setContentBackground(slide);
  addSectionTitle(slide, titleBase);

  // Build table rows: Initiative | Details
  const hasDetails = schedule.some(s => s.details);
  const headerRow = hasDetails ? [
    { text: 'Initiative', options: { bold: true, color: WHITE, fill: { color: AA_BLUE }, fontSize: 9, fontFace: FONT, align: 'center', valign: 'middle' } },
    { text: 'Details', options: { bold: true, color: WHITE, fill: { color: AA_BLUE }, fontSize: 9, fontFace: FONT, align: 'center', valign: 'middle' } },
  ] : [
    { text: 'Initiative', options: { bold: true, color: WHITE, fill: { color: AA_BLUE }, fontSize: 9, fontFace: FONT, align: 'center', valign: 'middle' } },
  ];
  const dataRows = schedule.map((item) => hasDetails ? [
    { text: item.initiative || '', options: { fontSize: 9, fontFace: FONT, color: DARK, bold: true, valign: 'middle' } },
    { text: item.details || '', options: { fontSize: 9, fontFace: FONT, color: DARK, valign: 'middle' } },
  ] : [
    { text: item.initiative || '', options: { fontSize: 9, fontFace: FONT, color: DARK, valign: 'middle' } },
  ]);

  const tableY = 1.15;
  // Scale row height based on item count to fit on one slide
  const maxTableH = (goalText ? 3.4 : 3.8);
  const rowH = Math.min(0.45, maxTableH / (dataRows.length + 1));

  slide.addTable([headerRow, ...dataRows], {
    x: MARGIN, y: tableY, w: CONTENT_W,
    border: { type: 'solid', pt: 0.5, color: 'E0E0E0' },
    rowH,
    colW: hasDetails ? [CONTENT_W * 0.35, CONTENT_W * 0.65] : [CONTENT_W],
    autoPage: false,
  });

  // Goal statement below table
  if (goalText) {
    const goalLines = goalText.split('\n').filter(Boolean);
    const uniqueGoal = [...new Set(goalLines)].join('\n');
    const goalY = tableY + (dataRows.length + 1) * rowH + 0.15;
    slide.addText(
      [
        { text: `${nextQ || q || 'Quarter'} Goal: `, options: { bold: true, color: AA_BLUE, fontSize: 9 } },
        { text: uniqueGoal, options: { bold: false, color: DARK, fontSize: 9 } },
      ],
      {
        x: MARGIN, y: Math.min(goalY, 4.7), w: CONTENT_W, h: 0.6,
        fontFace: FONT, valign: 'top',
      }
    );
  }

  const notesG2 = getNarrativeText(narratives, 'NOTES:G2');
  if (notesG2) slide.addNotes(notesG2);

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 16: Thank You (thin wrapper) ──────────────────

function addThankYouSlide(pptx, form, logoWhite, websiteUrl) {
  addDarkThankYouSlide(pptx, {
    closingMessage: 'We look forward to further collaboration and\ndelivering greater operational efficiencies.',
    logoWhite,
    websiteUrl,
  });
}

// ── Main Export ───────────────────────────────────────────

export async function generateQBUPptx(form, agentOutput, branding, { tenantId, submissionId } = {}) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'QBU_16x9', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'QBU_16x9';
  pptx.author = branding?.companyName || 'A&A Elevated Facility Solutions';
  pptx.subject = `QBU — ${form.cover.clientName || 'Client'} — ${form.cover.quarter || ''}`;
  pptx.title = `QBU ${form.cover.clientName || 'Client'} ${form.cover.quarter || ''}`;

  // Fetch logos — use tenant branding URL if available, fall back to local assets
  const logoSrc = branding?.logoUrl;
  const [logoWhite, logoColor] = await Promise.all([
    fetchLogoBase64(logoSrc || '/logo-white.png'),
    fetchLogoBase64(logoSrc || '/logo-color.png'),
  ]);

  // Parse agent narrative blocks (gracefully returns {} if none found)
  const narratives = parseAgentNarratives(agentOutput);

  const websiteUrl = branding?.websiteUrl || '';

  // Build slides in section order matching the QBU skill template
  addCoverSlide(pptx, form, logoWhite, websiteUrl);                  // 1  — Title
  addIntroductionsSlide(pptx, form, logoColor);                      // 2  — Introductions
  addSafetyMomentSlide(pptx, form, logoColor, narratives);           // 3  — A.1
  addSafetyComplianceSlide(pptx, form, logoColor, narratives);       // 4  — A.2
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
  await addInnovationPhotoSlides(pptx, form, logoColor);            //      G.1a
  addRoadmapSlide(pptx, form, logoColor, narratives);               // 15 — G.2
  addThankYouSlide(pptx, form, logoWhite, websiteUrl);               // 16 — Thank You

  // Generate filename
  const client = (form.cover.clientName || 'QBU').replace(/[^a-zA-Z0-9]/g, '-');
  const quarter = (form.cover.quarter || '').replace(/\s+/g, '');
  const filename = `QBU_${client}_${quarter}`;

  // Generate blob for storage + trigger browser download
  const blob = await pptx.write({ outputType: 'blob' });

  // Browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.pptx`;
  a.click();
  URL.revokeObjectURL(url);

  // Upload to Supabase Storage if we have tenant context
  let deckPath = null;
  if (tenantId && submissionId) {
    deckPath = await uploadDeck(tenantId, filename, blob);
    if (deckPath) {
      await saveDeckPath(submissionId, deckPath);
    }
  }

  return { deckPath };
}
