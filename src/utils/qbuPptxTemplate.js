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

// ── Cover Slide (thin wrapper) ───────────────────────────

function addCoverSlide(pptx, form, logoWhite) {
  const qLine = `Quarterly Business Update  |${form.cover.quarter || 'Q#'}|  ${form.cover.date || ''}`;
  addDarkCoverSlide(pptx, {
    primaryText: form.cover.clientName || 'Client Name',
    subtitleText: qLine,
    logoWhite,
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
  const tips = getNarrativeLines(narratives, 'A1:TIPS') || (s.keyTips ? s.keyTips.split('\n').filter(Boolean) : []);
  const reminders = getNarrativeLines(narratives, 'A1:REMINDERS') || (s.quickReminders ? s.quickReminders.split('\n').filter(Boolean) : []);
  const whyItMatters = getNarrativeText(narratives, 'A1:WHYITMATTERS') || s.whyItMatters;
  const hasWhyItMatters = !!whyItMatters;

  const cardY = 1.15;
  const maxCardBottom = hasWhyItMatters ? 4.05 : LOGO_SAFE_Y;
  const maxCardH = maxCardBottom - cardY;
  const headerPad = 0.65;
  const availBulletH = maxCardH - headerPad;
  const bulletColW = COL2_W - 0.5;

  // Split tips and reminders into pages that fit
  const tipPages = splitItemsToFit(tips, availBulletH, bulletColW);
  const reminderPages = splitItemsToFit(reminders, availBulletH, bulletColW);
  const totalPages = Math.max(tipPages.length, reminderPages.length, 1);

  for (let page = 0; page < totalPages; page++) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    const title = page === 0
      ? `Safety Moment \u2014 ${theme}`
      : `Safety Moment \u2014 ${theme} (cont.)`;
    addSectionTitle(slide, title);

    const pageTips = tipPages[page] || [];
    const pageReminders = reminderPages[page] || [];
    const maxBulletH = Math.max(
      estimateBulletH(pageTips, bulletColW),
      estimateBulletH(pageReminders, bulletColW),
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
    if (pageTips.length) {
      addCardBullets(slide, pageTips, { x: x1, y: cardY + 0.5, w: COL2_W, h: cardH - 0.7 });
    }

    // Quick Reminders card (red left border)
    addCard(slide, { x: x2, y: cardY, w: COL2_W, h: cardH, borderColor: AA_RED, borderSide: 'left' });
    slide.addText('QUICK REMINDERS', {
      x: x2 + 0.2, y: cardY + 0.15, w: COL2_W - 0.4, h: 0.3,
      fontSize: 11, fontFace: FONT, color: DARK, bold: true,
    });
    if (pageReminders.length) {
      addCardBullets(slide, pageReminders, { x: x2, y: cardY + 0.5, w: COL2_W, h: cardH - 0.7 });
    }

    // Why It Matters callout box on first page only
    if (page === 0 && hasWhyItMatters) {
      const callY = cardY + cardH + 0.2;
      addCalloutBox(slide, {
        x: MARGIN, y: callY, w: CONTENT_W, h: 0.85,
        label: 'Why It Matters:', text: whyItMatters,
      });
    }

    addLogoBottomRight(slide, logoColor);
  }
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
  const e = form.executive;
  const cardY = 1.15;
  const gap = 0.3;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.8; // space for card header + padding above bullets
  const availBulletH = maxCardH - headerPad;

  const cols = [
    { title: 'KEY ACHIEVEMENTS', items: getNarrativeLines(narratives, 'B1:ACHIEVEMENTS') || (e.achievements || []).filter(Boolean), color: AA_BLUE },
    { title: 'STRATEGIC CHALLENGES', items: getNarrativeLines(narratives, 'B1:CHALLENGES') || (e.challenges || []).filter(Boolean), color: AMBER },
    { title: 'INNOVATION MILESTONES', items: getNarrativeLines(narratives, 'B1:INNOVATIONS') || (e.innovations || []).filter(Boolean), color: GREEN },
  ];

  // Estimate tallest column bullet height at 10pt
  const maxBulletH = Math.max(...cols.map((c) => estimateBulletH(c.items, COL3_W - 0.5)));
  const fitsOnOne = maxBulletH <= availBulletH;

  // Determine how many items per column fit on one slide at 10pt
  // Use per-item height estimates to find the split point
  function itemsThatFit(items) {
    let h = 0;
    for (let i = 0; i < items.length; i++) {
      const itemH = estimateBulletH([items[i]], COL3_W - 0.5);
      if (h + itemH > availBulletH) return i;
      h += itemH;
    }
    return items.length;
  }

  // Mild tightening: use 9pt only if just barely overflowing (within 15%)
  const bulletFontSize = !fitsOnOne && maxBulletH <= availBulletH * 1.15 ? 9 : 10;

  /** Render one Executive Summary slide with the given column items */
  function renderExecSlide(slideTitle, colItems) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, slideTitle);

    const slideBulletH = Math.max(...colItems.map((c) => estimateBulletH(c.items, COL3_W - 0.5)));
    const cardH = Math.min(slideBulletH + headerPad, maxCardH);

    colItems.forEach((col, i) => {
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
            x: x + 0.25, y: cardY + 0.6, w: COL3_W - 0.5, h: cardH - headerPad,
            fontSize: bulletFontSize, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
            valign: 'top',
          }
        );
      }
    });

    addLogoBottomRight(slide, logoColor);
  }

  if (fitsOnOne || bulletFontSize === 9) {
    // Everything fits on one slide (at 10pt or mild 9pt tightening)
    renderExecSlide('Executive Summary', cols);
  } else {
    // Split: first slide shows items that fit, second slide shows the rest
    const firstSliceCols = cols.map((col) => {
      const count = itemsThatFit(col.items);
      return { ...col, items: col.items.slice(0, count) };
    });
    const remainderCols = cols.map((col, ci) => {
      const count = itemsThatFit(col.items);
      return { ...col, items: col.items.slice(count) };
    }).filter((col) => col.items.length > 0);

    renderExecSlide('Executive Summary', firstSliceCols);
    if (remainderCols.length) {
      renderExecSlide('Executive Summary (cont.)', remainderCols);
    }
  }
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

  // Dynamic batch sizing — try 3, then 2, then 1 category per slide
  const allCatKeys = Object.keys(categories);
  const cardY = 1.15;
  const gap = 0.3;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.8;
  let slideIdx = 0;
  let catIdx = 0;

  while (catIdx < allCatKeys.length) {
    // Try fitting 3, then 2, then 1 categories on one slide
    let batchSize = Math.min(3, allCatKeys.length - catIdx);
    let chosenColW, chosenGap, chosenKeys, fits;

    while (batchSize >= 1) {
      chosenKeys = allCatKeys.slice(catIdx, catIdx + batchSize);
      chosenColW = batchSize === 1 ? CONTENT_W : batchSize === 2 ? COL2_W : COL3_W;
      chosenGap = batchSize === 2 ? 0.3 : gap;
      const tallestBulletH = Math.max(...chosenKeys.map((k) => estimateBulletH(categories[k], chosenColW - 0.5)));
      fits = tallestBulletH + headerPad <= maxCardH;
      if (fits) break;
      batchSize--;
    }
    if (batchSize < 1) batchSize = 1;
    chosenKeys = allCatKeys.slice(catIdx, catIdx + batchSize);
    chosenColW = batchSize === 1 ? CONTENT_W : batchSize === 2 ? COL2_W : COL3_W;
    chosenGap = batchSize === 2 ? 0.3 : gap;

    // Single category that overflows — split its items across pages
    if (batchSize === 1 && !fits) {
      const catKey = chosenKeys[0];
      const availBulletH = maxCardH - headerPad;
      const itemPages = splitItemsToFit(categories[catKey], availBulletH, chosenColW - 0.5);

      for (let p = 0; p < itemPages.length; p++) {
        const slide = pptx.addSlide();
        setContentBackground(slide);
        addSectionTitle(slide, slideIdx === 0 && p === 0
          ? 'Completed Projects Showcase'
          : 'Completed Projects Showcase (cont.)');

        const pageItems = itemPages[p];
        const bulletH = estimateBulletH(pageItems, chosenColW - 0.5);
        const pageCardH = Math.min(bulletH + headerPad, maxCardH);
        const x = MARGIN;

        addCard(slide, { x, y: cardY, w: chosenColW, h: pageCardH, borderColor: AA_BLUE, borderSide: 'top' });
        slide.addText(catKey.toUpperCase(), {
          x: x + 0.15, y: cardY + 0.15, w: chosenColW - 0.3, h: 0.3,
          fontSize: 10, fontFace: FONT, color: DARK, bold: true,
        });
        slide.addText(
          pageItems.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
          {
            x: x + 0.25, y: cardY + 0.6, w: chosenColW - 0.5, h: pageCardH - headerPad,
            fontSize: 10, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
            valign: 'top',
          }
        );
        addLogoBottomRight(slide, logoColor);
        slideIdx++;
      }
    } else {
      // Normal case — categories fit on one slide
      const slide = pptx.addSlide();
      setContentBackground(slide);
      addSectionTitle(slide, slideIdx === 0
        ? 'Completed Projects Showcase'
        : 'Completed Projects Showcase (cont.)');

      const maxBulletH = Math.max(...chosenKeys.map((k) => estimateBulletH(categories[k], chosenColW - 0.5)));
      const cardH = Math.min(maxBulletH + headerPad, maxCardH);

      chosenKeys.forEach((cat, i) => {
        const x = MARGIN + i * (chosenColW + chosenGap);
        addCard(slide, { x, y: cardY, w: chosenColW, h: cardH, borderColor: AA_BLUE, borderSide: 'top' });
        slide.addText(cat.toUpperCase(), {
          x: x + 0.15, y: cardY + 0.15, w: chosenColW - 0.3, h: 0.3,
          fontSize: 10, fontFace: FONT, color: DARK, bold: true,
        });
        slide.addText(
          categories[cat].map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true, paraSpaceBefore: 4 } })),
          {
            x: x + 0.25, y: cardY + 0.6, w: chosenColW - 0.5, h: cardH - headerPad,
            fontSize: 10, fontFace: FONT, color: DARK, lineSpacingMultiple: 1.3,
            valign: 'top',
          }
        );
      });

      addLogoBottomRight(slide, logoColor);
      slideIdx++;
    }

    catIdx += batchSize;
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
    const base64 = await fileToBase64(photo.file);
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

async function addPhotoSlides(pptx, form, logoColor) {
  const photos = form.projects?.photos || [];
  const withFiles = photos.filter((p) => p.file instanceof File);
  if (!withFiles.length) return; // Skip photo slides entirely when no photos

  const { pairs, singles } = pairBeforeAfterPhotos(withFiles);

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
      let textY = currentY + 0.08;
      if (loc) {
        pageSlide.addText(loc.toUpperCase(), {
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

  // Split paired items across slides using cumulative height (not averages)
  const cardY = 1.15;
  const maxCardH = LOGO_SAFE_Y - cardY;
  const headerPad = 0.8; // card header + padding above bullets
  const availBulletH = maxCardH - headerPad;

  const batches = [];
  let batchStart = 0;
  let batchH = 0;
  for (let i = 0; i < allChallengeTexts.length; i++) {
    const chH = estimateBulletH([allChallengeTexts[i]], COL2_W - 0.5);
    const acH = estimateBulletH([allActionTexts[i]], COL2_W - 0.5);
    const itemH = Math.max(chH, acH);
    if (i > batchStart && batchH + itemH > availBulletH) {
      batches.push({ start: batchStart, end: i });
      batchStart = i;
      batchH = itemH;
    } else {
      batchH += itemH;
    }
  }
  if (batchStart < allChallengeTexts.length) {
    batches.push({ start: batchStart, end: allChallengeTexts.length });
  }
  if (!batches.length) batches.push({ start: 0, end: 0 });

  for (let batch = 0; batch < batches.length; batch++) {
    const slide = pptx.addSlide();
    setContentBackground(slide);
    addSectionTitle(slide, batch === 0
      ? 'Addressing Key Operational Challenges'
      : 'Addressing Key Operational Challenges (cont.)');

    const { start: startIdx, end: endIdx } = batches[batch];
    const challengeTexts = allChallengeTexts.slice(startIdx, endIdx);
    const actionTexts = allActionTexts.slice(startIdx, endIdx);

    const x1 = MARGIN;
    const x2 = MARGIN + COL2_W + 0.3;
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
      addCardBullets(slide, challengeTexts, { x: x1, y: cardY + 0.6, w: COL2_W, h: cardH - headerPad });
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
      addCardBullets(slide, actionTexts, { x: x2, y: cardY + 0.6, w: COL2_W, h: cardH - headerPad });
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
    // Clip to items that fit within the card to prevent overflow
    const availH = cardH - 0.8;
    const bulletColW = COL2_W - 0.5;
    const fittingPages = splitItemsToFit(notes, availH, bulletColW);
    addCardBullets(slide, fittingPages[0], { x: x2, y: cardY + 0.6, w: COL2_W, h: availH });
  }

  addLogoBottomRight(slide, logoColor);
}

// ── Slide 14: G.1 Innovation & Technology Integration ───

// ── Slide G.1a: Innovation Photos ────────────────────────

async function addInnovationPhotoSlides(pptx, form, logoColor) {
  const photos = form.roadmap?.photos || [];
  const withFiles = photos.filter((p) => p.file instanceof File);
  if (!withFiles.length) return; // Skip when no innovation photos

  const { pairs, singles } = pairBeforeAfterPhotos(withFiles);

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
      const base64 = await fileToBase64(photo.file);
      const xPos = j === 0 ? MARGIN : MARGIN + COL2_W + 0.3;

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

// ── Slide 16: Thank You (thin wrapper) ──────────────────

function addThankYouSlide(pptx, form, logoWhite) {
  addDarkThankYouSlide(pptx, {
    closingMessage: 'We look forward to further collaboration and\ndelivering greater operational efficiencies.',
    logoWhite,
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
  await addInnovationPhotoSlides(pptx, form, logoColor);            //      G.1a
  addRoadmapSlide(pptx, form, logoColor, narratives);               // 15 — G.2
  addThankYouSlide(pptx, form, logoWhite);                           // 16 — Thank You

  // Generate filename and trigger download
  const client = (form.cover.clientName || 'QBU').replace(/[^a-zA-Z0-9]/g, '-');
  const quarter = (form.cover.quarter || '').replace(/\s+/g, '');
  const filename = `QBU_${client}_${quarter}`;

  await pptx.writeFile({ fileName: filename });
}
