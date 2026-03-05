const ExcelJS = require('exceljs');
const path = require('path');

// ── A&A Brand Colors ──
const AA_BLUE = '009ADE';
const AA_BLUE_LIGHT = 'E8F4FD';
const AA_RED = 'E12F2C';
const DARK = '272727';
const MED_GREY = '5A5D62';
const LIGHT_GREY = 'F2F2F2';
const WHITE = 'FFFFFF';
const GREEN = '43A047';
const GREEN_LIGHT = 'E8F5E9';
const AMBER = 'F0A030';
const AMBER_LIGHT = 'FFF8E1';

// ── Style Presets ──
const sectionHeaderFont = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF' + WHITE } };
const sectionHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + AA_BLUE } };
const subHeaderFont = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF' + MED_GREY } };
const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GREY } };
const tableHeaderFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + WHITE } };
const tableHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + MED_GREY } };
const labelFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + DARK } };
const labelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
const inputFont = { name: 'Calibri', size: 10, color: { argb: 'FF' + DARK } };
const inputFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + WHITE } };
const prefilledFont = { name: 'Calibri', size: 10, color: { argb: 'FF' + MED_GREY } };
const prefilledFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
const accentFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF' + AA_RED } };

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
};

// ── Helpers ──
function setColWidths(ws, widths) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function addSectionHeader(ws, row, text, colCount) {
  const r = ws.getRow(row);
  r.getCell(1).value = text;
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).font = sectionHeaderFont;
    r.getCell(c).fill = sectionHeaderFill;
    r.getCell(c).alignment = { vertical: 'middle' };
  }
  r.height = 28;
}

function addSubHeader(ws, row, text, colCount) {
  const r = ws.getRow(row);
  r.getCell(1).value = text;
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).font = subHeaderFont;
    r.getCell(c).fill = subHeaderFill;
  }
  r.height = 20;
}

function addTableHeaders(ws, row, headers) {
  const r = ws.getRow(row);
  headers.forEach((h, i) => {
    r.getCell(i + 1).value = h;
    r.getCell(i + 1).font = tableHeaderFont;
    r.getCell(i + 1).fill = tableHeaderFill;
    r.getCell(i + 1).alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
    r.getCell(i + 1).border = thinBorder;
  });
  r.height = 22;
}

function addLabelRow(ws, row, label, colCount) {
  const r = ws.getRow(row);
  r.getCell(1).value = label;
  r.getCell(1).font = labelFont;
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).fill = labelFill;
    r.getCell(c).border = thinBorder;
  }
}

function addInputRow(ws, row, colCount) {
  const r = ws.getRow(row);
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).font = inputFont;
    r.getCell(c).fill = inputFill;
    r.getCell(c).border = thinBorder;
  }
}

function addPrefilledRow(ws, row, values) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    r.getCell(i + 1).value = v;
    r.getCell(i + 1).font = prefilledFont;
    r.getCell(i + 1).fill = prefilledFill;
    r.getCell(i + 1).border = thinBorder;
  });
}

function addNumberedRow(ws, row, num, colCount) {
  const r = ws.getRow(row);
  r.getCell(1).value = `${num}.`;
  r.getCell(1).font = { ...labelFont, color: { argb: 'FF' + MED_GREY } };
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).fill = inputFill;
    r.getCell(c).border = thinBorder;
  }
}

function addBlankRow(ws, row, colCount) {
  const r = ws.getRow(row);
  for (let c = 1; c <= colCount; c++) {
    r.getCell(c).fill = inputFill;
  }
  r.height = 8;
}

// ═══════════════════════════════════════════════
async function generateTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Alf Platform';

  // ── Cover & Intros ──
  {
    const ws = wb.addWorksheet('Cover & Intros');
    setColWidths(ws, [36, 36]);
    const cols = 2;

    addSectionHeader(ws, 1, 'COVER SLIDE', cols);
    addBlankRow(ws, 2, cols);
    addLabelRow(ws, 3, 'Client Name', cols);
    addInputRow(ws, 3, cols); ws.getRow(3).getCell(1).font = labelFont;
    addLabelRow(ws, 4, 'Quarter (Q1/Q2/Q3/Q4)', cols);
    addLabelRow(ws, 5, 'Date (e.g. March 2026)', cols);
    addLabelRow(ws, 6, 'Job Name', cols);
    addLabelRow(ws, 7, 'Job Number', cols);
    addLabelRow(ws, 8, 'Region VP', cols);
    addBlankRow(ws, 9, cols);

    addSectionHeader(ws, 10, 'A&A TEAM ATTENDEES', cols);
    addTableHeaders(ws, 11, ['Name', 'Title']);
    for (let r = 12; r <= 19; r++) addInputRow(ws, r, cols);

    addSectionHeader(ws, 20, 'CLIENT TEAM ATTENDEES', cols);
    addTableHeaders(ws, 21, ['Name', 'Title']);
    for (let r = 22; r <= 28; r++) addInputRow(ws, r, cols);
  }

  // ── Safety ──
  {
    const ws = wb.addWorksheet('Safety');
    setColWidths(ws, [36, 20, 20, 20, 20, 20]);
    const cols = 6;

    addSectionHeader(ws, 1, 'SAFETY MOMENT', cols);
    addSubHeader(ws, 2, 'Theme rotates quarterly: winter prep, slip/fall, PPE, heat illness, ergonomics, chemical safety.', cols);
    addBlankRow(ws, 3, cols);
    addLabelRow(ws, 4, 'Theme', cols);
    addLabelRow(ws, 5, 'Key Safety Tips (4)', cols);
    addLabelRow(ws, 6, 'Quick Reminders (4)', cols);
    addLabelRow(ws, 7, 'Why It Matters', cols);
    addBlankRow(ws, 8, cols);

    // NEW: Safety Metrics
    const metricsHeaderFont = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF' + WHITE } };
    const metricsHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } };
    const r9 = ws.getRow(9);
    r9.getCell(1).value = 'SAFETY METRICS';
    for (let c = 1; c <= cols; c++) {
      r9.getCell(c).font = metricsHeaderFont;
      r9.getCell(c).fill = metricsHeaderFill;
      r9.getCell(c).alignment = { vertical: 'middle' };
    }
    r9.height = 28;
    addSubHeader(ws, 10, 'Enter counts for each category. Leave blank to omit from the slide.', cols);
    addLabelRow(ws, 11, 'Number of Safety Inspections', cols);
    addLabelRow(ws, 12, 'Number of Good Saves', cols);
    addLabelRow(ws, 13, 'Number of Recordables', cols);
    addBlankRow(ws, 14, cols);

    addSectionHeader(ws, 15, 'RECORDABLE INCIDENTS BY QUARTER', cols);
    addSubHeader(ws, 16, 'Enter 0 if none. Add rows for additional locations.', cols);
    addTableHeaders(ws, 17, ['Location', 'Q1', 'Q2', 'Q3', 'Q4', 'Annual Total']);
    for (let r = 18; r <= 21; r++) addInputRow(ws, r, cols);
    // TOTAL row with accent
    const totalRow = ws.getRow(22);
    totalRow.getCell(1).value = 'TOTAL';
    for (let c = 1; c <= cols; c++) {
      totalRow.getCell(c).font = { ...labelFont, bold: true };
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      totalRow.getCell(c).border = thinBorder;
    }
    addBlankRow(ws, 23, cols);

    addSectionHeader(ws, 24, 'GOOD SAVES', cols);
    addSubHeader(ws, 25, 'Hazards identified and prevented. Include location, hazard, and corrective action.', cols);
    addTableHeaders(ws, 26, ['Location', 'Hazard Prevented', 'Corrective Action', 'Who Notified', '', '']);
    for (let r = 27; r <= 32; r++) addInputRow(ws, r, cols);
    addBlankRow(ws, 33, cols);

    // Recordable incident details — use amber accent
    const detailHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + AMBER } };
    const r34 = ws.getRow(34);
    r34.getCell(1).value = 'RECORDABLE INCIDENT DETAILS';
    for (let c = 1; c <= cols; c++) {
      r34.getCell(c).font = sectionHeaderFont;
      r34.getCell(c).fill = detailHeaderFill;
      r34.getCell(c).alignment = { vertical: 'middle' };
    }
    r34.height = 28;
    addSubHeader(ws, 35, 'For each recordable: location, date, cause, treatment, return-to-work date.', cols);
    addTableHeaders(ws, 36, ['Location', 'Date', 'Description/Cause', 'Treatment', 'Return to Work Date', '']);
    for (let r = 37; r <= 39; r++) addInputRow(ws, r, cols);
  }

  // ── Work Tickets ──
  {
    const ws = wb.addWorksheet('Work Tickets');
    setColWidths(ws, [36, 20, 20, 16]);
    const cols = 4;

    addSectionHeader(ws, 1, 'WORK TICKETS — YoY COMPARISON', cols);
    addSubHeader(ws, 2, 'Enter total work orders by location for current quarter and same quarter prior year.', cols);
    addBlankRow(ws, 3, cols);
    addTableHeaders(ws, 4, ['Location', 'Prior Year Q#', 'Current Year Q#', '% Change']);
    for (let r = 5; r <= 8; r++) addInputRow(ws, r, cols);
    // TOTAL
    const totalRow = ws.getRow(9);
    totalRow.getCell(1).value = 'TOTAL';
    for (let c = 1; c <= cols; c++) {
      totalRow.getCell(c).font = { ...labelFont, bold: true };
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      totalRow.getCell(c).border = thinBorder;
    }
    addBlankRow(ws, 10, cols);

    addLabelRow(ws, 11, 'Key Takeaway', cols);
    addSubHeader(ws, 12, 'Explain what drove the change (e.g. "Lighthouse deployed reducing ticket volume by 12%").', cols);
    addInputRow(ws, 13, cols);
    addBlankRow(ws, 14, cols);

    addLabelRow(ws, 15, 'Events Supported', cols);
    ws.getRow(15).getCell(1).font = accentFont;
    addSubHeader(ws, 16, 'List events supported this quarter with dates.', cols);
    addInputRow(ws, 17, cols);
  }

  // ── Audits & Actions ──
  {
    const ws = wb.addWorksheet('Audits & Actions');
    setColWidths(ws, [36, 20, 20, 20, 16]);
    const cols = 5;

    addSectionHeader(ws, 1, 'AUDITS & CORRECTIVE ACTIONS — QoQ', cols);
    addSubHeader(ws, 2, 'Enter audit and corrective action counts by location. Use actual location names.', cols);
    addBlankRow(ws, 3, cols);
    addTableHeaders(ws, 4, ['Metric', 'Location 1', 'Location 2', 'Location 3', 'Total']);
    addPrefilledRow(ws, 5, ['Prior Qtr Audits', '', '', '', '']);
    addPrefilledRow(ws, 6, ['Prior Qtr Actions', '', '', '', '']);
    addPrefilledRow(ws, 7, ['Current Qtr Audits', '', '', '', '']);
    addPrefilledRow(ws, 8, ['Current Qtr Actions', '', '', '', '']);
    addBlankRow(ws, 9, cols);
    addLabelRow(ws, 10, 'Audit Change Explanation', cols);
    addInputRow(ws, 10, cols); ws.getRow(10).getCell(1).font = labelFont;
    addLabelRow(ws, 11, 'Action Change Explanation', cols);
    addInputRow(ws, 11, cols); ws.getRow(11).getCell(1).font = labelFont;
    addBlankRow(ws, 12, cols);

    addSectionHeader(ws, 13, 'TOP CORRECTIVE ACTION AREAS', cols);
    addSubHeader(ws, 14, 'List the top areas where corrective actions were needed.', cols);
    addTableHeaders(ws, 15, ['Area', 'Count', '', '', '']);
    const areas = ['Restrooms', 'Common Areas', 'Classrooms', 'Cafeteria', 'Stairwells', 'Other'];
    areas.forEach((area, i) => {
      addPrefilledRow(ws, 16 + i, [area, '', '', '', '']);
    });
  }

  // ── Executive Summary ──
  {
    const ws = wb.addWorksheet('Executive Summary');
    setColWidths(ws, [12, 60]);
    const cols = 2;

    addSectionHeader(ws, 1, 'KEY ACHIEVEMENTS (3-5)', cols);
    addSubHeader(ws, 2, 'Concrete accomplishments with specifics. Be honest — cite metrics and buildings.', cols);
    for (let r = 3; r <= 7; r++) addNumberedRow(ws, r, r - 2, cols);
    addBlankRow(ws, 8, cols);

    // Challenges — amber accent
    const r9 = ws.getRow(9);
    r9.getCell(1).value = 'STRATEGIC CHALLENGES (2-3)';
    for (let c = 1; c <= cols; c++) {
      r9.getCell(c).font = sectionHeaderFont;
      r9.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + AMBER } };
      r9.getCell(c).alignment = { vertical: 'middle' };
    }
    r9.height = 28;
    addSubHeader(ws, 10, 'Be honest — spin undermines trust.', cols);
    for (let r = 11; r <= 13; r++) addNumberedRow(ws, r, r - 10, cols);
    addBlankRow(ws, 14, cols);

    // Innovation — green accent
    const r15 = ws.getRow(15);
    r15.getCell(1).value = 'INNOVATION MILESTONES (2-5)';
    for (let c = 1; c <= cols; c++) {
      r15.getCell(c).font = sectionHeaderFont;
      r15.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } };
      r15.getCell(c).alignment = { vertical: 'middle' };
    }
    r15.height = 28;
    addSubHeader(ws, 16, 'Tech deployments, process improvements, equipment additions.', cols);
    for (let r = 17; r <= 21; r++) addNumberedRow(ws, r, r - 16, cols);
  }

  // ── Projects & Satisfaction ──
  {
    const ws = wb.addWorksheet('Projects & Satisfaction');
    setColWidths(ws, [26, 26, 30, 26]);
    const cols = 4;

    addSectionHeader(ws, 1, 'COMPLETED PROJECTS BY CATEGORY', cols);
    addSubHeader(ws, 2, 'Name buildings, describe what was done. Be specific.', cols);
    addBlankRow(ws, 3, cols);
    addTableHeaders(ws, 4, ['Category', 'Project Description', '', '']);
    const cats = ['Renovation/Deep Clean','Renovation/Deep Clean','Renovation/Deep Clean','Grounds','Grounds','Grounds','Events Supported','Events Supported','Events Supported'];
    cats.forEach((cat, i) => {
      addPrefilledRow(ws, 5 + i, [cat, '', '', '']);
    });
    addBlankRow(ws, 14, cols);

    addSectionHeader(ws, 15, 'PROJECT PHOTOS', cols);
    addSubHeader(ws, 16, 'List photos to include. Actual image files go in the Photos tab.', cols);
    addTableHeaders(ws, 17, ['Photo Filename', 'Caption', 'Location', '']);
    for (let r = 18; r <= 25; r++) addInputRow(ws, r, cols);

    addSectionHeader(ws, 26, 'CLIENT TESTIMONIALS', cols);
    addSubHeader(ws, 27, 'Direct quotes from emails, texts, or meetings. Include the event name or context.', cols);
    addTableHeaders(ws, 28, ['Location', 'Event / Context', 'Quote', 'Attribution (Name & Title)']);
    for (let r = 29; r <= 32; r++) addInputRow(ws, r, cols);
  }

  // ── Challenges & Actions ──
  {
    const ws = wb.addWorksheet('Challenges & Actions');
    setColWidths(ws, [26, 36, 36]);
    const cols = 3;

    addSectionHeader(ws, 1, 'OPERATIONAL CHALLENGES & ACTIONS TAKEN', cols);
    addSubHeader(ws, 2, 'Recurring issues only — not one-time incidents. Every challenge must map to an action.', cols);
    addBlankRow(ws, 3, cols);
    addTableHeaders(ws, 4, ['Location', 'Challenge (Recurring Issue)', 'Action Taken / Planned']);
    for (let r = 5; r <= 11; r++) addInputRow(ws, r, cols);

    addSectionHeader(ws, 12, 'PRIOR QUARTER ACTION FOLLOW-UP', cols);
    addSubHeader(ws, 13, 'For actions committed last quarter — report on delivery.', cols);
    addTableHeaders(ws, 14, ['Action Item', 'Status (Complete/In Progress/Not Started)', 'Notes']);
    for (let r = 15; r <= 18; r++) addInputRow(ws, r, cols);
  }

  // ── Financial ──
  {
    const ws = wb.addWorksheet('Financial');
    setColWidths(ws, [36, 30]);
    const cols = 2;

    addSectionHeader(ws, 1, 'FINANCIAL OVERVIEW', cols);
    addBlankRow(ws, 2, cols);
    addLabelRow(ws, 3, 'As-of Date', cols);
    addLabelRow(ws, 4, 'Total Outstanding', cols);
    addBlankRow(ws, 5, cols);

    addSectionHeader(ws, 6, 'AGING BREAKDOWN', cols);
    addTableHeaders(ws, 7, ['Aging Bucket', 'Amount']);
    addPrefilledRow(ws, 8, ['1-30 days', '']);
    addPrefilledRow(ws, 9, ['31-60 days', '']);
    addPrefilledRow(ws, 10, ['61-90 days', '']);
    addPrefilledRow(ws, 11, ['91+ days', '']);
    addBlankRow(ws, 12, cols);

    addSectionHeader(ws, 13, 'FINANCIAL STRATEGY NOTES', cols);
    addSubHeader(ws, 14, 'AR coordination, disputed items, projections shared.', cols);
    for (let r = 15; r <= 18; r++) addNumberedRow(ws, r, r - 14, cols);
  }

  // ── Innovation & Roadmap ──
  {
    const ws = wb.addWorksheet('Innovation & Roadmap');
    setColWidths(ws, [30, 30, 30]);
    const cols = 3;

    // Green accent for innovation
    const r1 = ws.getRow(1);
    r1.getCell(1).value = 'INNOVATION & TECHNOLOGY HIGHLIGHTS';
    for (let c = 1; c <= cols; c++) {
      r1.getCell(c).font = sectionHeaderFont;
      r1.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN } };
      r1.getCell(c).alignment = { vertical: 'middle' };
    }
    r1.height = 28;
    addSubHeader(ws, 2, 'New tech, equipment, or process improvements. Connect each to an operational benefit.', cols);
    addBlankRow(ws, 3, cols);
    addTableHeaders(ws, 4, ['Innovation / Technology', 'Description & Results', 'Operational Benefit']);
    for (let r = 5; r <= 11; r++) addInputRow(ws, r, cols);

    addSectionHeader(ws, 12, 'NEXT QUARTER ROADMAP', cols);
    addSubHeader(ws, 13, 'Concrete operational items — not vague goals. This is the action plan.', cols);
    addTableHeaders(ws, 14, ['Month', 'Initiative', 'Details']);
    addPrefilledRow(ws, 15, ['Month 1', '', '']);
    addPrefilledRow(ws, 16, ['Month 2', '', '']);
    addPrefilledRow(ws, 17, ['Month 3', '', '']);
    addInputRow(ws, 18, cols);
    addInputRow(ws, 19, cols);

    addLabelRow(ws, 20, 'Quarter Goal Statement', cols);
    ws.getRow(20).getCell(1).font = accentFont;
    addSubHeader(ws, 21, 'One sentence summarizing the Q targets.', cols);
  }

  // ── Write file ──
  const outPath = path.join(__dirname, '..', 'public', 'qbu-intake-template.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Styled template written to', outPath);

  // Also copy to Desktop
  const desktopPath = '/Users/philip/Desktop/qbu-intake-template.xlsx';
  await wb.xlsx.writeFile(desktopPath);
  console.log('Also written to', desktopPath);
}

generateTemplate().catch(e => console.error(e));
