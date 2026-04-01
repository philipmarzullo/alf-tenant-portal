/**
 * Rebuild QBU intake template v3 — structural changes from Leo's biannual feedback.
 *
 * Source: ~/Desktop/qbu-intake-template-v2 (2).xlsx (current v2 template)
 * Dest:   public/qbu-intake-template-v2.xlsx (same filename, parser auto-detects version)
 *
 * Changes:
 * 1. Cover: Add Job 2 Name / Job 2 Number rows after Job Number
 * 2. Audits: Replace sheet with quarterly tables (Q1-Q4) + prior comparison + per-location explanations
 * 3. Challenges: Add Status + Quarter cols to items, add Location col to priorFollowUp
 * 4. Projects: Change [Category, Description] → [Location, Category, Description, Operational Benefit]
 * 5. Roadmap: "Month" → "Location / Timeline", clear pre-filled values
 */

const ExcelJS = require('exceljs');
const path = require('path');

const SRC = path.join(require('os').homedir(), 'Desktop/qbu-intake-template-v2 (2).xlsx');
const DEST = path.resolve(__dirname, '../public/qbu-intake-template-v2.xlsx');

/** Deep-clone a cell's style */
function cloneStyle(cell) {
  return cell.style ? JSON.parse(JSON.stringify(cell.style)) : {};
}

/** Copy style from one cell to another */
function copyStyle(src, dest) {
  if (src.style) dest.style = JSON.parse(JSON.stringify(src.style));
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);

  // ══════════════════════════════════════════════════════════
  // 1. COVER — Add Job 2 Name / Job 2 Number rows
  // ══════════════════════════════════════════════════════════
  const cover = wb.getWorksheet('Cover & Intros');
  if (!cover) throw new Error('Sheet "Cover & Intros" not found');

  // Current layout (after v2 script): row 7 = Job Name, row 8 = Job Number, row 9 = Region VP
  // Insert 2 rows after row 8 (Job Number) — pushes Region VP + teams down
  cover.spliceRows(9, 0, [], []);

  // Row 9 = Job 2 Name, Row 10 = Job 2 Number
  const jobNameRow = cover.getRow(7);
  const row9 = cover.getRow(9);
  const row10 = cover.getRow(10);
  row9.height = jobNameRow.height;
  row10.height = jobNameRow.height;

  const cellA9 = cover.getCell('A9');
  cellA9.value = 'Job 2 Name';
  copyStyle(cover.getCell('A7'), cellA9);

  const cellB9 = cover.getCell('B9');
  cellB9.value = '';
  copyStyle(cover.getCell('B7'), cellB9);

  const cellA10 = cover.getCell('A10');
  cellA10.value = 'Job 2 Number';
  copyStyle(cover.getCell('A8'), cellA10);

  const cellB10 = cover.getCell('B10');
  cellB10.value = '';
  copyStyle(cover.getCell('B8'), cellB10);

  console.log('✓ Cover: Added Job 2 Name/Number rows after Job Number');

  // ══════════════════════════════════════════════════════════
  // 2. AUDITS — Rebuild sheet with quarterly tables
  // ══════════════════════════════════════════════════════════
  const audits = wb.getWorksheet('Audits & Actions');
  if (!audits) throw new Error('Sheet "Audits & Actions" not found');

  // Capture styles from existing cells before removing
  const headerStyle = cloneStyle(audits.getCell('A1'));   // section header
  const subHeaderStyle = cloneStyle(audits.getCell('A4')); // column header
  const dataStyle = cloneStyle(audits.getCell('A5'));      // data cell
  const valueStyle = cloneStyle(audits.getCell('B5'));     // value cell
  const explLabelStyle = cloneStyle(audits.getCell('A10')); // explanation label
  const explValueStyle = cloneStyle(audits.getCell('B10')); // explanation value
  const auditSheetIdx = audits.orderNo;

  // Remove and recreate the sheet to avoid OOM from clearing cells
  wb.removeWorksheet(audits.id);
  const newAudits = wb.addWorksheet('Audits & Actions');
  // Move it back to original position
  newAudits.orderNo = auditSheetIdx;

  // Alias for cell-setting below
  const auditsWs = newAudits;

  // Set column widths
  auditsWs.getColumn(1).width = 22; // Location
  auditsWs.getColumn(2).width = 10; // Q1
  auditsWs.getColumn(3).width = 10; // Q2
  auditsWs.getColumn(4).width = 10; // Q3
  auditsWs.getColumn(5).width = 10; // Q4
  auditsWs.getColumn(6).width = 14; // Annual

  let row = 1;

  // ── AUDIT COUNTS BY QUARTER ──
  const setCell = (r, c, val, style) => {
    const cell = auditsWs.getCell(r, c);
    cell.value = val;
    if (style) cell.style = JSON.parse(JSON.stringify(style));
  };

  setCell(row, 1, 'AUDIT COUNTS BY QUARTER', headerStyle);
  row += 2; // row 3 = column headers
  setCell(row, 1, 'Location', subHeaderStyle);
  setCell(row, 2, 'Q1', subHeaderStyle);
  setCell(row, 3, 'Q2', subHeaderStyle);
  setCell(row, 4, 'Q3', subHeaderStyle);
  setCell(row, 5, 'Q4', subHeaderStyle);
  setCell(row, 6, 'Annual Total', subHeaderStyle);
  for (let i = 1; i <= 4; i++) {
    row++;
    setCell(row, 1, `Location ${i}`, dataStyle);
    for (let c = 2; c <= 6; c++) setCell(row, c, '', valueStyle);
  }
  row += 2;

  // ── CORRECTIVE ACTION COUNTS BY QUARTER ──
  setCell(row, 1, 'CORRECTIVE ACTION COUNTS BY QUARTER', headerStyle);
  row += 2;
  setCell(row, 1, 'Location', subHeaderStyle);
  setCell(row, 2, 'Q1', subHeaderStyle);
  setCell(row, 3, 'Q2', subHeaderStyle);
  setCell(row, 4, 'Q3', subHeaderStyle);
  setCell(row, 5, 'Q4', subHeaderStyle);
  setCell(row, 6, 'Annual Total', subHeaderStyle);
  for (let i = 1; i <= 4; i++) {
    row++;
    setCell(row, 1, `Location ${i}`, dataStyle);
    for (let c = 2; c <= 6; c++) setCell(row, c, '', valueStyle);
  }
  row += 2;

  // ── PRIOR YEAR COMPARISON ──
  setCell(row, 1, 'PRIOR YEAR COMPARISON', headerStyle);
  row += 2;
  setCell(row, 1, 'Location', subHeaderStyle);
  setCell(row, 2, 'Prior Audits', subHeaderStyle);
  setCell(row, 3, 'Prior Actions', subHeaderStyle);
  for (let i = 1; i <= 4; i++) {
    row++;
    setCell(row, 1, `Location ${i}`, dataStyle);
    setCell(row, 2, '', valueStyle);
    setCell(row, 3, '', valueStyle);
  }
  row += 2;

  // ── EXPLANATIONS ──
  setCell(row, 1, 'CHANGE EXPLANATIONS', headerStyle);
  row += 1;
  setCell(row, 1, 'Audit Change Explanation', explLabelStyle);
  setCell(row, 2, '', explValueStyle);
  row += 1;
  setCell(row, 1, 'Action Change Explanation', explLabelStyle);
  setCell(row, 2, '', explValueStyle);
  row += 2;

  // ── PER-LOCATION EXPLANATIONS ──
  setCell(row, 1, 'PER-LOCATION EXPLANATIONS', headerStyle);
  row += 2;
  setCell(row, 1, 'Location', subHeaderStyle);
  setCell(row, 2, 'Audit Explanation', subHeaderStyle);
  setCell(row, 3, 'Action Explanation', subHeaderStyle);
  for (let i = 1; i <= 4; i++) {
    row++;
    setCell(row, 1, `Location ${i}`, dataStyle);
    setCell(row, 2, '', valueStyle);
    setCell(row, 3, '', valueStyle);
  }
  row += 2;

  // ── TOP CORRECTIVE ACTION AREAS ──
  setCell(row, 1, 'TOP CORRECTIVE ACTION AREAS', headerStyle);
  row += 2;
  setCell(row, 1, 'Area', subHeaderStyle);
  setCell(row, 2, 'Location 1', subHeaderStyle);
  setCell(row, 3, 'Location 2', subHeaderStyle);
  setCell(row, 4, 'Location 3', subHeaderStyle);
  const defaultAreas = ['Restrooms', 'Common Areas', 'Classrooms', 'Cafeteria', 'Stairwells', 'Other'];
  for (const area of defaultAreas) {
    row++;
    setCell(row, 1, area, dataStyle);
    for (let c = 2; c <= 4; c++) setCell(row, c, '', valueStyle);
  }

  console.log('✓ Audits: Rebuilt with quarterly tables, prior comparison, per-location explanations');

  // ══════════════════════════════════════════════════════════
  // 3. CHALLENGES — Add Status + Quarter cols; add Location to priorFollowUp
  // ══════════════════════════════════════════════════════════
  const challenges = wb.getWorksheet('Challenges & Actions');
  if (!challenges) throw new Error('Sheet "Challenges & Actions" not found');

  // Items table: currently cols A-C (Location, Challenge, Action) in rows 4-11
  // Add cols D (Status) and E (Quarter) — just need headers + widen
  const chDataStyle = cloneStyle(challenges.getCell('A5'));
  const chHeaderStyle = cloneStyle(challenges.getCell('A4'));

  // Set new column headers
  const cellD4 = challenges.getCell('D4');
  cellD4.value = 'Status';
  cellD4.style = JSON.parse(JSON.stringify(chHeaderStyle));

  const cellE4 = challenges.getCell('E4');
  cellE4.value = 'Quarter';
  cellE4.style = JSON.parse(JSON.stringify(chHeaderStyle));

  // Add empty data cells for the new columns
  for (let r = 5; r <= 11; r++) {
    const cellD = challenges.getCell(r, 4);
    cellD.value = '';
    cellD.style = JSON.parse(JSON.stringify(chDataStyle));
    const cellE = challenges.getCell(r, 5);
    cellE.value = '';
    cellE.style = JSON.parse(JSON.stringify(chDataStyle));
  }

  // Set column widths for new columns
  challenges.getColumn(4).width = 14;
  challenges.getColumn(5).width = 10;

  // PriorFollowUp table: currently cols A-C (Action, Status, Notes) in rows 14-18
  // Need to shift to cols A-D (Location, Action, Status, Notes)
  // Move existing data rightward first
  for (let r = 14; r <= 18; r++) {
    const oldA = challenges.getCell(r, 1).value;
    const oldB = challenges.getCell(r, 2).value;
    const oldC = challenges.getCell(r, 3).value;
    const styleA = cloneStyle(challenges.getCell(r, 1));
    const styleB = cloneStyle(challenges.getCell(r, 2));
    const styleC = cloneStyle(challenges.getCell(r, 3));

    if (r === 14) {
      // Header row: insert "Location" as first col
      challenges.getCell(r, 1).value = 'Location';
      challenges.getCell(r, 1).style = JSON.parse(JSON.stringify(chHeaderStyle));
      challenges.getCell(r, 2).value = oldA; // "Action Item"
      challenges.getCell(r, 2).style = JSON.parse(JSON.stringify(styleA));
      challenges.getCell(r, 3).value = oldB; // "Status"
      challenges.getCell(r, 3).style = JSON.parse(JSON.stringify(styleB));
      challenges.getCell(r, 4).value = oldC; // "Notes"
      challenges.getCell(r, 4).style = JSON.parse(JSON.stringify(styleC));
    } else {
      // Data rows: shift values right, add empty Location
      challenges.getCell(r, 4).value = oldC;
      challenges.getCell(r, 4).style = JSON.parse(JSON.stringify(styleC));
      challenges.getCell(r, 3).value = oldB;
      challenges.getCell(r, 3).style = JSON.parse(JSON.stringify(styleB));
      challenges.getCell(r, 2).value = oldA;
      challenges.getCell(r, 2).style = JSON.parse(JSON.stringify(styleA));
      challenges.getCell(r, 1).value = '';
      challenges.getCell(r, 1).style = JSON.parse(JSON.stringify(chDataStyle));
    }
  }

  console.log('✓ Challenges: Added Status/Quarter to items, Location to priorFollowUp');

  // ══════════════════════════════════════════════════════════
  // 4. PROJECTS — [Category, Description] → [Location, Category, Description, Operational Benefit]
  // ══════════════════════════════════════════════════════════
  const projects = wb.getWorksheet('Projects & Satisfaction');
  if (!projects) throw new Error('Sheet "Projects & Satisfaction" not found');

  const projHeaderStyle = cloneStyle(projects.getCell('A4'));
  const projDataStyle = cloneStyle(projects.getCell('A5'));
  const projDescStyle = cloneStyle(projects.getCell('B5'));

  // Shift existing data rightward: col B (Description) → col C, col A (Category) → col B
  // Then add Location in col A and Benefit in col D
  for (let r = 4; r <= 13; r++) {
    const oldA = projects.getCell(r, 1).value;
    const oldB = projects.getCell(r, 2).value;
    const styleA = cloneStyle(projects.getCell(r, 1));
    const styleB = cloneStyle(projects.getCell(r, 2));

    if (r === 4) {
      // Header row
      projects.getCell(r, 1).value = 'Location';
      projects.getCell(r, 1).style = JSON.parse(JSON.stringify(projHeaderStyle));
      projects.getCell(r, 2).value = oldA; // "Category"
      projects.getCell(r, 2).style = JSON.parse(JSON.stringify(styleA));
      projects.getCell(r, 3).value = oldB; // "Project Description"
      projects.getCell(r, 3).style = JSON.parse(JSON.stringify(styleB));
      projects.getCell(r, 4).value = 'Operational Benefit';
      projects.getCell(r, 4).style = JSON.parse(JSON.stringify(projHeaderStyle));
    } else {
      // Data rows
      projects.getCell(r, 3).value = oldB; // description → col C
      projects.getCell(r, 3).style = JSON.parse(JSON.stringify(styleB));
      projects.getCell(r, 2).value = oldA; // category → col B
      projects.getCell(r, 2).style = JSON.parse(JSON.stringify(styleA));
      projects.getCell(r, 1).value = '';   // location → col A (empty)
      projects.getCell(r, 1).style = JSON.parse(JSON.stringify(projDataStyle));
      projects.getCell(r, 4).value = '';   // benefit → col D (empty)
      projects.getCell(r, 4).style = JSON.parse(JSON.stringify(projDescStyle));
    }
  }

  // Set column widths
  projects.getColumn(1).width = 20; // Location
  projects.getColumn(2).width = 22; // Category
  projects.getColumn(3).width = 40; // Description
  projects.getColumn(4).width = 30; // Operational Benefit

  console.log('✓ Projects: Changed to [Location, Category, Description, Operational Benefit]');

  // ══════════════════════════════════════════════════════════
  // 5. ROADMAP — "Month" → "Location / Timeline", clear pre-filled values
  // ══════════════════════════════════════════════════════════
  const roadmap = wb.getWorksheet('Innovation & Roadmap');
  if (!roadmap) throw new Error('Sheet "Innovation & Roadmap" not found');

  // Find the roadmap header row (contains "Month")
  roadmap.eachRow((row, rowNum) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'string') {
        if (cell.value.trim() === 'Month') {
          cell.value = 'Location / Timeline';
        }
        // Clear pre-filled "Month 1" through "Month 6" values
        if (/^Month\s+\d+$/.test(cell.value.trim())) {
          cell.value = '';
        }
      }
    });
  });

  console.log('✓ Roadmap: Changed "Month" → "Location / Timeline", cleared pre-filled values');

  // ══════════════════════════════════════════════════════════
  // SAVE
  // ══════════════════════════════════════════════════════════
  await wb.xlsx.writeFile(DEST);
  console.log(`\n✓ Template saved to ${DEST}`);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
