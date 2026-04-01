import * as XLSX from 'xlsx';

// ── Helpers ──────────────────────────────────────────────

/** Read a cell as a string */
function cell(rows, r, c) {
  const val = rows?.[r - 1]?.[c] ?? '';
  return typeof val === 'number' ? String(val) : (val || '').toString().trim();
}

/** Read a cell that should be a date — convert Excel serial numbers */
function dateCell(rows, r, c) {
  const raw = rows?.[r - 1]?.[c] ?? '';
  if (typeof raw === 'number' && raw > 25000 && raw < 80000) {
    const date = new Date((raw - 25569) * 86400000);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return (raw || '').toString().trim();
}

/** Read a cell that should be currency — format as $X,XXX.XX */
function currencyCell(rows, r, c) {
  const raw = rows?.[r - 1]?.[c] ?? '';
  if (typeof raw === 'number') {
    return '$' + raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const str = (raw || '').toString().trim();
  // If already has $, return as-is; if it's a plain number string, format it
  if (str && !str.startsWith('$')) {
    const num = parseFloat(str.replace(/,/g, ''));
    if (!isNaN(num)) return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return str;
}

function cellRange(rows, rStart, rEnd, c) {
  const out = [];
  for (let r = rStart; r <= rEnd; r++) {
    const v = cell(rows, r, c);
    if (v) out.push(v);
  }
  return out;
}

function rowObjects(rows, rStart, rEnd, cols, keys) {
  const out = [];
  for (let r = rStart; r <= rEnd; r++) {
    const obj = {};
    let hasData = false;
    for (let i = 0; i < keys.length; i++) {
      obj[keys[i]] = cell(rows, r, cols[i]);
      if (obj[keys[i]]) hasData = true;
    }
    if (hasData) out.push(obj);
  }
  return out;
}

function findSheet(wb, name) {
  const lower = name.toLowerCase().trim();
  const match = wb.SheetNames.find((n) => n.toLowerCase().trim() === lower);
  return match ? XLSX.utils.sheet_to_json(wb.Sheets[match], { header: 1 }) : null;
}

function concat(rows, rStart, rEnd, c) {
  const parts = [];
  for (let r = rStart; r <= rEnd; r++) {
    const v = cell(rows, r, c);
    if (v) parts.push(v);
  }
  return parts.join('\n');
}

/** Read multiple columns from a single row and join non-empty values */
function cellsAcross(rows, r, cStart, cEnd, separator = '\n') {
  const parts = [];
  for (let c = cStart; c <= cEnd; c++) {
    const v = cell(rows, r, c);
    if (v) parts.push(v);
  }
  return parts.join(separator);
}

// ── Placeholder / Header Row Filtering ───────────────────

const PLACEHOLDER_WORDS = new Set([
  'name', 'title', 'location', 'quote', 'attribution', 'attribution (name & title)',
  'name & title', 'hazard', 'action', 'notified', 'challenge', 'notes',
  'description', 'innovation', 'benefit', 'initiative', 'details', 'month', 'event', 'event / context',
  'quote', 'attribution (name & title)', 'project description', 'photo filename', 'caption',
  'category', 'client team attendees', 'a&a team attendees', 'a&a team',
  'client team', 'date', 'cause', 'treatment', 'return to work date',
  'corrective action', 'hazard prevented', 'who notified', 'status',
  'total', 'annual total', 'metric', 'area', 'amount',
  'description/cause', 'q1', 'q2', 'q3', 'q4', 'ytd',
  '% change', 'prior year q#', 'current year q#',
  'quarter', 'operational benefit', 'benefit', 'prior audits', 'prior actions',
  'location / timeline', 'job name', 'job number',
]);

/** Check if a value looks like a header/placeholder label rather than real data */
function isPlaceholder(val) {
  if (!val) return false;
  return PLACEHOLDER_WORDS.has(val.toLowerCase().trim());
}

/** Filter team member rows — remove placeholder entries */
function filterTeam(rows) {
  return rows.filter((r) => r.name && !isPlaceholder(r.name) && !isPlaceholder(r.title));
}

/** Generic filter — remove rows where ALL non-empty values are placeholders */
function filterPlaceholders(rows, keys) {
  return rows.filter((row) => {
    const nonEmpty = keys.filter((k) => row[k]);
    if (!nonEmpty.length) return false;
    // Keep if at least one value is NOT a placeholder
    return nonEmpty.some((k) => !isPlaceholder(row[k]));
  });
}

// ── Section Parsers ──────────────────────────────────────

function parseCover(wb, warnings) {
  const rows = findSheet(wb, 'Cover & Intros');
  if (!rows) { warnings.push('Sheet "Cover & Intros" not found — skipping cover section'); return {}; }

  // Detect v2.2+ layout: row 3 contains "Review Type" label in column A
  const row3Label = cell(rows, 3, 0).toLowerCase();
  const row3Value = cell(rows, 3, 1).toLowerCase().trim();
  const isReviewTypeRow = row3Label.includes('review type')
    || (row3Value && ['quarterly', 'bi-annual', 'biannual', 'annual'].includes(row3Value));

  let reviewType = 'quarterly';
  let offset = 0; // row offset for remaining fields when new row is present

  if (isReviewTypeRow) {
    offset = 1;
    if (row3Value.includes('annual') && !row3Value.includes('bi')) reviewType = 'annual';
    else if (row3Value.includes('bi') || row3Value.includes('semi')) reviewType = 'biannual';
  }

  // Detect multi-job rows: scan for "Job 2" label after the primary job row
  const primaryJobRow = 6 + offset; // Job Name row
  const jobs = [{ jobName: cell(rows, primaryJobRow, 1), jobNumber: cell(rows, primaryJobRow + 1, 1) }];
  let extraJobRows = 0;
  for (let r = primaryJobRow + 2; r <= primaryJobRow + 6; r++) {
    const label = cell(rows, r, 0).toLowerCase();
    if (label.includes('job') && /\d/.test(label) && label.includes('name')) {
      jobs.push({ jobName: cell(rows, r, 1), jobNumber: cell(rows, r + 1, 1) });
      extraJobRows += 2;
      r++; // skip the number row
    } else {
      break;
    }
  }

  const aaTeam = filterTeam(rowObjects(rows, 11 + offset + extraJobRows, 25 + offset + extraJobRows, [0, 1], ['name', 'title']));
  const clientTeam = filterTeam(rowObjects(rows, 27 + offset + extraJobRows, 40 + offset + extraJobRows, [0, 1], ['name', 'title']));

  return {
    reviewType,
    clientName: cell(rows, 3 + offset, 1),
    quarter: cell(rows, 4 + offset, 1),
    date: dateCell(rows, 5 + offset, 1),
    jobs: jobs.filter(j => j.jobName || j.jobNumber),
    // Backward compat scalars — first job
    jobName: jobs[0].jobName,
    jobNumber: jobs[0].jobNumber,
    regionVP: cell(rows, 8 + offset + extraJobRows, 1),
    aaTeam: aaTeam.length ? aaTeam : [{ name: '', title: '' }],
    clientTeam: clientTeam.length ? clientTeam : [{ name: '', title: '' }],
  };
}

function parseSafety(wb, warnings) {
  const rows = findSheet(wb, 'Safety');
  if (!rows) { warnings.push('Sheet "Safety" not found — skipping safety section'); return {}; }

  // ── Detect v2 layout: look for "SAFETY INSPECTIONS BY QUARTER" header ──
  let isV2 = false;
  let inspByQHeaderRow = -1;
  for (let r = 1; r <= Math.min(rows.length, 15); r++) {
    const val = cell(rows, r, 0).toUpperCase();
    if (val.includes('SAFETY INSPECTIONS BY QUARTER')) {
      isV2 = true;
      inspByQHeaderRow = r;
      break;
    }
  }

  if (isV2) {
    // ── V2 Layout ──
    // Safety Moment: rows 1-7 (same as v1)
    // SAFETY INSPECTIONS BY QUARTER: header at inspByQHeaderRow, data rows follow
    // Location / Q1 / Q2 / Q3 / Q4 / Annual Total
    const inspDataStart = inspByQHeaderRow + 1;  // skip header row (Location/Q1/Q2/...)
    const inspectionsByQuarter = filterPlaceholders(
      rowObjects(rows, inspDataStart + 1, inspDataStart + 4, [0, 1, 2, 3, 4, 5], ['location', 'q1', 'q2', 'q3', 'q4', 'annual']),
      ['location']
    );

    // Find RECORDABLE INCIDENTS BY QUARTER header
    let recHeaderRow = -1;
    for (let r = inspByQHeaderRow + 1; r <= Math.min(rows.length, 25); r++) {
      const val = cell(rows, r, 0).toUpperCase();
      if (val.includes('RECORDABLE INCIDENTS BY QUARTER')) { recHeaderRow = r; break; }
    }
    const recDataStart = recHeaderRow > 0 ? recHeaderRow + 1 : inspDataStart + 6;
    const incidents = filterPlaceholders(
      rowObjects(rows, recDataStart + 1, recDataStart + 4, [0, 1, 2, 3, 4, 5], ['location', 'q1', 'q2', 'q3', 'q4', 'annual']),
      ['location']
    );

    // Find ALL section headers so we can limit reading ranges
    let gsHeaderRow = -1;       // "GOOD SAVES BY QUARTER" or "GOOD SAVES"
    let gsDetailHeaderRow = -1; // "GOOD SAVE DETAILS" (v2.1 layout)
    let detHeaderRow = -1;      // "RECORDABLE INCIDENT DETAILS"
    let hasGsByQuarter = false;
    for (let r = recDataStart; r <= Math.min(rows.length, 50); r++) {
      const val = cell(rows, r, 0).toUpperCase();
      if (val.includes('GOOD SAVES BY QUARTER') && gsHeaderRow < 0) { gsHeaderRow = r; hasGsByQuarter = true; }
      else if (val.includes('GOOD SAVE DETAILS') && gsDetailHeaderRow < 0) { gsDetailHeaderRow = r; }
      else if (val.includes('GOOD SAVES') && gsHeaderRow < 0) { gsHeaderRow = r; }
      if (val.includes('RECORDABLE INCIDENT DETAILS') && detHeaderRow < 0) { detHeaderRow = r; }
    }

    // Parse Good Saves by Quarter (counts per location/quarter)
    let goodSavesByQuarter = [];
    if (hasGsByQuarter && gsHeaderRow > 0) {
      // Header row right after section header has Location/Q1/Q2/Q3/Q4/Annual
      let gsQColumnHeader = -1;
      for (let r = gsHeaderRow + 1; r <= gsHeaderRow + 2; r++) {
        if (cell(rows, r, 0).toLowerCase().includes('location') && cell(rows, r, 1)) { gsQColumnHeader = r; break; }
      }
      if (gsQColumnHeader < 0) gsQColumnHeader = gsHeaderRow + 1; // fallback: assume header immediately follows
      const gsQDataStart = gsQColumnHeader + 1;
      const gsQDataEnd = gsDetailHeaderRow > 0 ? gsDetailHeaderRow - 1 : gsQDataStart + 4;
      goodSavesByQuarter = filterPlaceholders(
        rowObjects(rows, gsQDataStart, gsQDataEnd, [0, 1, 2, 3, 4, 5], ['location', 'q1', 'q2', 'q3', 'q4', 'annual']),
        ['location']
      );
    }

    // Parse Good Save details (current quarter)
    const gsDetailSearchStart = gsDetailHeaderRow > 0 ? gsDetailHeaderRow : gsHeaderRow;
    let gsColumnHeaderRow = -1;
    if (gsDetailSearchStart > 0) {
      const limit = detHeaderRow > 0 ? detHeaderRow : gsDetailSearchStart + 6;
      for (let r = gsDetailSearchStart + 1; r < limit; r++) {
        if (cell(rows, r, 0).toLowerCase().includes('location') && cell(rows, r, 1)) {
          gsColumnHeaderRow = r; break;
        }
      }
    }
    const gsDataStart = gsColumnHeaderRow > 0 ? gsColumnHeaderRow + 1 : (gsDetailSearchStart > 0 ? gsDetailSearchStart + 3 : recDataStart + 8);
    const gsDataEnd = detHeaderRow > 0 ? detHeaderRow - 1 : gsDataStart + 5;
    const goodSaves = filterPlaceholders(
      rowObjects(rows, gsDataStart, gsDataEnd, [0, 1, 2, 3], ['location', 'hazard', 'action', 'notified']),
      ['location', 'hazard', 'action', 'notified']
    );

    // Find Incident Details column header — must have "Location" in col A AND a value in col B
    let detColumnHeaderRow = -1;
    if (detHeaderRow > 0) {
      for (let r = detHeaderRow + 1; r <= detHeaderRow + 3; r++) {
        if (cell(rows, r, 0).toLowerCase().includes('location') && cell(rows, r, 1)) {
          detColumnHeaderRow = r; break;
        }
      }
    }
    const detDataStart = detColumnHeaderRow > 0 ? detColumnHeaderRow + 1 : (detHeaderRow > 0 ? detHeaderRow + 3 : gsDataEnd + 3);
    const incidentDetails = filterPlaceholders(
      rowObjects(rows, detDataStart, detDataStart + 4, [0, 1, 2, 3, 4], ['location', 'date', 'cause', 'treatment', 'returnDate']),
      ['location', 'date', 'cause', 'treatment', 'returnDate']
    );

    // Convert date fields
    incidentDetails.forEach((row) => {
      const num = parseFloat(row.date);
      if (!isNaN(num) && num > 25000 && num < 80000) {
        const d = new Date((num - 25569) * 86400000);
        row.date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (row.returnDate) {
        const rNum = parseFloat(row.returnDate);
        if (!isNaN(rNum) && rNum > 25000 && rNum < 80000) {
          const d = new Date((rNum - 25569) * 86400000);
          row.returnDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
    });

    // Compute aggregate counts from quarterly data
    const safetyInspections = String(inspectionsByQuarter.reduce((s, r) =>
      s + (Number(r.q1) || 0) + (Number(r.q2) || 0) + (Number(r.q3) || 0) + (Number(r.q4) || 0), 0)) || '';
    const recordableCount = String(incidents.reduce((s, r) =>
      s + (Number(r.q1) || 0) + (Number(r.q2) || 0) + (Number(r.q3) || 0) + (Number(r.q4) || 0), 0)) || '';
    let goodSaveCount = goodSavesByQuarter.length
      ? String(goodSavesByQuarter.reduce((s, r) => s + (Number(r.q1)||0) + (Number(r.q2)||0) + (Number(r.q3)||0) + (Number(r.q4)||0), 0))
      : (goodSaves.length ? String(goodSaves.length) : '');

    return {
      theme: cell(rows, 4, 1),
      keyTips: cellsAcross(rows, 5, 1, 4),
      quickReminders: cellsAcross(rows, 6, 1, 4),
      whyItMatters: cellsAcross(rows, 7, 1, 4),
      safetyInspections,
      goodSaveCount,
      recordableCount,
      safetyMetricsByLocation: [],
      inspectionsByQuarter: inspectionsByQuarter.length ? inspectionsByQuarter : [],
      incidents: incidents.length ? incidents : [{ location: '', q1: '', q2: '', q3: '', q4: '' }],
      goodSavesByQuarter: goodSavesByQuarter.length ? goodSavesByQuarter : [],
      goodSaves: goodSaves.length ? goodSaves : [{ location: '', hazard: '', action: '', notified: '' }],
      incidentDetails: incidentDetails.length ? incidentDetails : [{ location: '', date: '', cause: '', treatment: '', returnDate: '' }],
    };
  }

  // ── V1 Layout (backward compat) ──
  // Safety Metrics — row 11 has location headers (Post Campus, Brooklyn Campus),
  // rows 12-14 have the counts per campus. Preserve per-campus AND aggregate.
  const safetyLocationHeaders = [];
  for (let c = 1; c <= 4; c++) {
    const name = cell(rows, 11, c);
    if (name && name.toLowerCase() !== 'total') safetyLocationHeaders.push(name);
  }
  function sumMetric(row) {
    let total = 0;
    for (let c = 1; c <= Math.max(safetyLocationHeaders.length, 1); c++) {
      total += Number(cell(rows, row, c)) || 0;
    }
    return total > 0 ? String(total) : '';
  }
  const safetyInspections = sumMetric(12);
  let goodSaveCount = sumMetric(13);
  const recordableCount = sumMetric(14);

  // Recordable Incidents by Quarter (rows 18-21 — stop before TOTAL row at 22)
  const incidents = filterPlaceholders(
    rowObjects(rows, 18, 21, [0, 1, 2, 3, 4], ['location', 'q1', 'q2', 'q3', 'q4']),
    ['location']
  );
  // Good Saves (rows 27-32, shifted +6 from old rows 21-26)
  const goodSaves = filterPlaceholders(
    rowObjects(rows, 27, 32, [0, 1, 2, 3], ['location', 'hazard', 'action', 'notified']),
    ['location', 'hazard', 'action', 'notified']
  );

  // Auto-count good saves from detail rows when count cell is blank
  if (!goodSaveCount && goodSaves.length) {
    goodSaveCount = String(goodSaves.length);
  }

  // Per-campus breakdown for table display
  const safetyMetricsByLocation = safetyLocationHeaders.length > 1
    ? safetyLocationHeaders.map((loc, i) => {
        let gs = cell(rows, 13, 1 + i);
        // Auto-count per-campus good saves from detail rows when count cell is blank
        if (!gs && goodSaves.length) {
          const locLower = loc.toLowerCase();
          gs = String(goodSaves.filter(s => (s.location || '').toLowerCase().includes(locLower.split(' ')[0])).length);
          if (gs === '0') gs = '';
        }
        return {
          location: loc,
          inspections: cell(rows, 12, 1 + i),
          goodSaves: gs,
          recordables: cell(rows, 14, 1 + i),
        };
      })
    : [];
  // Recordable Incident Details (rows 36-38, shifted +6 from old rows 30-32)
  const incidentDetails = filterPlaceholders(
    rowObjects(rows, 36, 38, [0, 1, 2, 3, 4], ['location', 'date', 'cause', 'treatment', 'returnDate']),
    ['location', 'date', 'cause', 'treatment', 'returnDate']
  );

  // Convert date fields in incident details
  incidentDetails.forEach((row) => {
    const num = parseFloat(row.date);
    if (!isNaN(num) && num > 25000 && num < 80000) {
      const d = new Date((num - 25569) * 86400000);
      row.date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (row.returnDate) {
      const rNum = parseFloat(row.returnDate);
      if (!isNaN(rNum) && rNum > 25000 && rNum < 80000) {
        const d = new Date((rNum - 25569) * 86400000);
        row.returnDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
  });

  return {
    theme: cell(rows, 4, 1),
    keyTips: cellsAcross(rows, 5, 1, 4),
    quickReminders: cellsAcross(rows, 6, 1, 4),
    whyItMatters: cellsAcross(rows, 7, 1, 4),
    safetyInspections,
    goodSaveCount,
    recordableCount,
    safetyMetricsByLocation,
    inspectionsByQuarter: [],
    goodSavesByQuarter: [],
    incidents: incidents.length ? incidents : [{ location: '', q1: '', q2: '', q3: '', q4: '' }],
    goodSaves: goodSaves.length ? goodSaves : [{ location: '', hazard: '', action: '', notified: '' }],
    incidentDetails: incidentDetails.length ? incidentDetails : [{ location: '', date: '', cause: '', treatment: '', returnDate: '' }],
  };
}

function parseWorkTickets(wb, warnings) {
  const rows = findSheet(wb, 'Work Tickets');
  if (!rows) { warnings.push('Sheet "Work Tickets" not found — skipping work tickets section'); return {}; }

  // ── Detect v2 layout: look for "WORK TICKETS BY QUARTER" header ──
  let isV2 = false;
  for (let r = 1; r <= Math.min(rows.length, 5); r++) {
    const val = cell(rows, r, 0).toUpperCase();
    if (val.includes('WORK TICKETS BY QUARTER')) { isV2 = true; break; }
  }

  if (isV2) {
    // V2: quarterly breakdown (rows 5-8) + YoY comparison (rows 14-17)
    const ticketsByQuarter = filterPlaceholders(
      rowObjects(rows, 5, 8, [0, 1, 2, 3, 4, 5], ['location', 'q1', 'q2', 'q3', 'q4', 'ytd']),
      ['location']
    );

    // YoY comparison section starts at row 13 header, data rows 14-17
    const locations = filterPlaceholders(
      rowObjects(rows, 14, 17, [0, 1, 2], ['location', 'priorYear', 'currentYear']),
      ['location']
    );

    return {
      ticketsByQuarter: ticketsByQuarter.length ? ticketsByQuarter : [],
      locations: locations.length ? locations : [{ location: '', priorYear: '', currentYear: '' }],
      keyTakeaway: cell(rows, 20, 1) || cell(rows, 22, 0),
      eventsSupported: concat(rows, 26, 40, 0),
    };
  }

  // V1: simple YoY comparison (rows 5-8)
  const locations = filterPlaceholders(
    rowObjects(rows, 5, 8, [0, 1, 2], ['location', 'priorYear', 'currentYear']),
    ['location']
  );

  return {
    ticketsByQuarter: [],
    locations: locations.length ? locations : [{ location: '', priorYear: '', currentYear: '' }],
    keyTakeaway: cell(rows, 11, 1),
    eventsSupported: concat(rows, 17, 31, 0),
  };
}

function parseAudits(wb, warnings) {
  const rows = findSheet(wb, 'Audits & Actions');
  if (!rows) { warnings.push('Sheet "Audits & Actions" not found — skipping audits section'); return {}; }

  // ── Detect v3 layout: look for "AUDIT COUNTS BY QUARTER" header ──
  let isV3 = false;
  let auditByQHeaderRow = -1;
  for (let r = 1; r <= Math.min(rows.length, 10); r++) {
    const val = cell(rows, r, 0).toUpperCase();
    if (val.includes('AUDIT COUNTS BY QUARTER')) { isV3 = true; auditByQHeaderRow = r; break; }
  }

  if (isV3) {
    // ── V3: Quarterly tables ──
    // AUDIT COUNTS BY QUARTER table: header row + data rows (Location / Q1 / Q2 / Q3 / Q4 / Annual)
    const auditDataStart = auditByQHeaderRow + 1; // column header row
    const auditsByQuarter = filterPlaceholders(
      rowObjects(rows, auditDataStart + 1, auditDataStart + 6, [0, 1, 2, 3, 4, 5], ['location', 'q1', 'q2', 'q3', 'q4', 'annual']),
      ['location']
    );

    // Find CORRECTIVE ACTION COUNTS BY QUARTER header
    let actionByQHeaderRow = -1;
    for (let r = auditByQHeaderRow + 1; r <= Math.min(rows.length, auditByQHeaderRow + 15); r++) {
      const val = cell(rows, r, 0).toUpperCase();
      if (val.includes('CORRECTIVE ACTION COUNTS BY QUARTER') || val.includes('ACTION COUNTS BY QUARTER')) { actionByQHeaderRow = r; break; }
    }
    const actionDataStart = actionByQHeaderRow > 0 ? actionByQHeaderRow + 1 : auditDataStart + 8;
    const actionsByQuarter = filterPlaceholders(
      rowObjects(rows, actionDataStart + 1, actionDataStart + 6, [0, 1, 2, 3, 4, 5], ['location', 'q1', 'q2', 'q3', 'q4', 'annual']),
      ['location']
    );

    // Find PRIOR YEAR COMPARISON header
    let priorHeaderRow = -1;
    const priorSearchStart = actionByQHeaderRow > 0 ? actionByQHeaderRow + 1 : auditDataStart + 12;
    for (let r = priorSearchStart; r <= Math.min(rows.length, priorSearchStart + 15); r++) {
      const val = cell(rows, r, 0).toUpperCase();
      if (val.includes('PRIOR YEAR COMPARISON') || val.includes('PRIOR YEAR')) { priorHeaderRow = r; break; }
    }
    const priorDataStart = priorHeaderRow > 0 ? priorHeaderRow + 1 : actionDataStart + 8;
    const priorComparison = filterPlaceholders(
      rowObjects(rows, priorDataStart + 1, priorDataStart + 6, [0, 1, 2], ['location', 'priorAudits', 'priorActions']),
      ['location']
    );

    // Find explanations section (overall + per-location)
    let explHeaderRow = -1;
    const explSearchStart = priorHeaderRow > 0 ? priorHeaderRow + 1 : priorDataStart + 6;
    for (let r = explSearchStart; r <= Math.min(rows.length, explSearchStart + 15); r++) {
      const val = cell(rows, r, 0).toUpperCase();
      if (val.includes('EXPLANATION') || val.includes('CHANGE EXPLANATION')) { explHeaderRow = r; break; }
    }
    let auditExplanation = '', actionExplanation = '';
    const locationExplanations = [];
    if (explHeaderRow > 0) {
      auditExplanation = cell(rows, explHeaderRow + 1, 1);
      actionExplanation = cell(rows, explHeaderRow + 2, 1);
      // Per-location explanations start after overall
      let locExplHeaderRow = -1;
      for (let r = explHeaderRow + 3; r <= Math.min(rows.length, explHeaderRow + 8); r++) {
        const val = cell(rows, r, 0).toUpperCase();
        if (val.includes('LOCATION') && val.includes('EXPLANATION')) { locExplHeaderRow = r; break; }
      }
      if (locExplHeaderRow > 0) {
        for (let r = locExplHeaderRow + 2; r <= Math.min(rows.length, locExplHeaderRow + 8); r++) {
          const loc = cell(rows, r, 0);
          if (!loc) break;
          locationExplanations.push({
            location: loc,
            auditExplanation: cell(rows, r, 1),
            actionExplanation: cell(rows, r, 2),
          });
        }
      }
    } else {
      // Fallback: look for explanation rows by label
      for (let r = priorDataStart + 6; r <= Math.min(rows.length, priorDataStart + 12); r++) {
        const label = cell(rows, r, 0).toLowerCase();
        if (label.includes('audit') && label.includes('explanation')) auditExplanation = cell(rows, r, 1);
        if (label.includes('action') && label.includes('explanation')) actionExplanation = cell(rows, r, 1);
      }
    }

    // Find TOP CORRECTIVE ACTION AREAS section
    let areasHeaderRow = -1;
    for (let r = explHeaderRow > 0 ? explHeaderRow + 1 : priorDataStart + 6; r <= Math.min(rows.length, rows.length); r++) {
      const val = cell(rows, r, 0).toUpperCase();
      if (val.includes('CORRECTIVE ACTION') || val.includes('TOP AREAS')) { areasHeaderRow = r; break; }
    }

    const { topAreas, topAreaLocations } = parseTopAreas(rows, areasHeaderRow, areasHeaderRow > 0 ? areasHeaderRow + 1 : rows.length);

    return {
      auditsByQuarter: auditsByQuarter.length ? auditsByQuarter : [{ location: '', q1: '', q2: '', q3: '', q4: '', annual: '' }],
      actionsByQuarter: actionsByQuarter.length ? actionsByQuarter : [{ location: '', q1: '', q2: '', q3: '', q4: '', annual: '' }],
      priorComparison: priorComparison.length ? priorComparison : [{ location: '', priorAudits: '', priorActions: '' }],
      auditExplanation,
      actionExplanation,
      locationExplanations,
      topAreas: topAreas.length ? topAreas : [{ area: '', count: '', values: [] }],
      topAreaLocations,
      // Legacy fields — normalize for backward compat with PPTX/agent that use old shape
      locationNames: auditsByQuarter.map(r => r.location).filter(Boolean),
      priorAudits: priorComparison.map(r => r.priorAudits),
      priorActions: priorComparison.map(r => r.priorActions),
      currentAudits: auditsByQuarter.map(r => {
        const vals = [Number(r.q1)||0, Number(r.q2)||0, Number(r.q3)||0, Number(r.q4)||0];
        return String(vals.reduce((a, b) => a + b, 0));
      }),
      currentActions: actionsByQuarter.map(r => {
        const vals = [Number(r.q1)||0, Number(r.q2)||0, Number(r.q3)||0, Number(r.q4)||0];
        return String(vals.reduce((a, b) => a + b, 0));
      }),
    };
  }

  // ── V1/V2 Layout (backward compat) — normalize into new shape ──
  // Read location names from header row 4, filter out "Total" and "Metric"
  const locationNames = [];
  for (let c = 1; c <= 4; c++) {
    const name = cell(rows, 4, c);
    if (name && !['total', 'metric'].includes(name.toLowerCase().trim())) locationNames.push(name);
  }

  // Detect v2 layout: row 5 starts with "Prior" (has prior + current quarter rows)
  const hasPriorRows = cell(rows, 5, 0).toLowerCase().includes('prior');

  let priorAudits, priorActions, currentAudits, currentActions, explanationStartRow;
  if (hasPriorRows) {
    priorAudits = locationNames.map((_, i) => cell(rows, 5, 1 + i));
    priorActions = locationNames.map((_, i) => cell(rows, 6, 1 + i));
    currentAudits = locationNames.map((_, i) => cell(rows, 7, 1 + i));
    currentActions = locationNames.map((_, i) => cell(rows, 8, 1 + i));
    explanationStartRow = 10;
  } else {
    priorAudits = [];
    priorActions = [];
    currentAudits = locationNames.map((_, i) => cell(rows, 5, 1 + i));
    currentActions = locationNames.map((_, i) => cell(rows, 6, 1 + i));
    explanationStartRow = 8;
  }

  const auditExplanation = cell(rows, explanationStartRow, 1);
  const actionExplanation = cell(rows, explanationStartRow + 1, 1);

  // Find TOP CORRECTIVE ACTION AREAS section header
  let areasHeaderRow = -1;
  for (let r = explanationStartRow + 1; r <= Math.min(rows.length, 25); r++) {
    const val = cell(rows, r, 0).toUpperCase();
    if (val.includes('CORRECTIVE ACTION') || val.includes('TOP AREAS')) { areasHeaderRow = r; break; }
  }

  const { topAreas, topAreaLocations } = parseTopAreas(rows, areasHeaderRow, areasHeaderRow > 0 ? areasHeaderRow + 1 : explanationStartRow + 3);

  // Build normalized v3 shape from old data
  const auditsByQuarter = locationNames.map((loc, i) => ({
    location: loc, q1: '', q2: '', q3: '', q4: currentAudits[i] || '', annual: currentAudits[i] || '',
  }));
  const actionsByQuarter = locationNames.map((loc, i) => ({
    location: loc, q1: '', q2: '', q3: '', q4: currentActions[i] || '', annual: currentActions[i] || '',
  }));
  const priorComparison = locationNames.map((loc, i) => ({
    location: loc, priorAudits: priorAudits[i] || '', priorActions: priorActions[i] || '',
  }));

  return {
    auditsByQuarter,
    actionsByQuarter,
    priorComparison,
    auditExplanation,
    actionExplanation,
    locationExplanations: [],
    topAreas: topAreas.length ? topAreas : [{ area: '', count: '', values: [] }],
    topAreaLocations,
    // Legacy fields preserved
    locationNames,
    priorAudits,
    priorActions,
    currentAudits,
    currentActions,
  };
}

/** Shared helper to parse Top Corrective Action Areas */
function parseTopAreas(rows, areasHeaderRow, searchStart) {
  // Find the table header row for areas (contains "Area" in col A)
  let areasTableHeaderRow = -1;
  for (let r = searchStart; r <= Math.min(rows.length, searchStart + 5); r++) {
    if (cell(rows, r, 0).toLowerCase().trim() === 'area') { areasTableHeaderRow = r; break; }
  }

  // Read area location names from table header row
  const areaLocationNames = [];
  if (areasTableHeaderRow > 0) {
    for (let c = 1; c <= 4; c++) {
      const name = cell(rows, areasTableHeaderRow, c);
      if (name && !['count', 'total', 'area'].includes(name.toLowerCase().trim())) areaLocationNames.push(name);
    }
  }

  // Read area data dynamically starting after header row
  const topAreas = [];
  const areaDataStart = areasTableHeaderRow > 0 ? areasTableHeaderRow + 1 : (areasHeaderRow > 0 ? areasHeaderRow + 3 : 16);
  for (let r = areaDataStart; r <= Math.min(rows.length, areaDataStart + 12); r++) {
    const areaName = cell(rows, r, 0);
    let hasValues = false;
    for (let c = 1; c <= Math.max(areaLocationNames.length, 1); c++) {
      if (cell(rows, r, c)) { hasValues = true; break; }
    }
    if (!areaName && !hasValues) break;
    if (!hasValues) continue;

    if (areaLocationNames.length > 1) {
      const values = areaLocationNames.map((_, ci) => cell(rows, r, 1 + ci));
      topAreas.push({ area: areaName || '(Unlabeled)', count: '', values });
    } else {
      topAreas.push({ area: areaName || '(Unlabeled)', count: cell(rows, r, 1), values: [] });
    }
  }

  const topAreaLocations = areaLocationNames.length > 1 ? areaLocationNames : [];
  return { topAreas, topAreaLocations };
}

function parseExecutive(wb, warnings) {
  const rows = findSheet(wb, 'Executive Summary');
  if (!rows) { warnings.push('Sheet "Executive Summary" not found — skipping executive section'); return {}; }

  const achievements = cellRange(rows, 3, 7, 1);
  const challenges = cellRange(rows, 11, 13, 1);
  const innovations = cellRange(rows, 17, 21, 1);

  return {
    achievements: achievements.length ? achievements : ['', '', ''],
    challenges: challenges.length ? challenges : ['', ''],
    innovations: innovations.length ? innovations : ['', ''],
  };
}

function parseProjects(wb, warnings) {
  const rows = findSheet(wb, 'Projects & Satisfaction');
  if (!rows) { warnings.push('Sheet "Projects & Satisfaction" not found — skipping projects section'); return {}; }

  // Detect new 4-col format: check if row 4 col 0 header = "Location"
  const firstColHeader = cell(rows, 4, 0).toLowerCase().trim();
  const hasLocationFormat = firstColHeader === 'location' || firstColHeader.includes('location');

  let completed;
  if (hasLocationFormat) {
    completed = rowObjects(rows, 5, 13, [0, 1, 2, 3], ['location', 'category', 'description', 'benefit'])
      .filter((r) => r.description && !isPlaceholder(r.description) && !isPlaceholder(r.category));
  } else {
    completed = rowObjects(rows, 5, 13, [0, 1], ['category', 'description'])
      .filter((r) => r.description && !isPlaceholder(r.description) && !isPlaceholder(r.category));
    // Normalize: add empty location/benefit
    completed = completed.map(r => ({ location: '', ...r, benefit: '' }));
  }

  // Rows 17-25 are photo references — warn user to upload separately
  let hasPhotoRefs = false;
  for (let r = 17; r <= 25; r++) {
    if (cell(rows, r, 0) || cell(rows, r, 1)) { hasPhotoRefs = true; break; }
  }
  if (hasPhotoRefs) warnings.push('Excel contains photo references (rows 17-25) — upload actual photos in the Photos section');

  const testimonials = filterPlaceholders(
    rowObjects(rows, 28, 32, [0, 1, 2, 3], ['location', 'event', 'quote', 'attribution']),
    ['location', 'quote', 'attribution']
  );

  return {
    completed: completed.length ? completed : [{ location: '', category: 'Renovation/Deep Clean', description: '', benefit: '' }],
    photos: [],
    testimonials: testimonials.length ? testimonials : [{ location: '', event: '', quote: '', attribution: '' }],
  };
}

function parseChallenges(wb, warnings) {
  const rows = findSheet(wb, 'Challenges & Actions');
  if (!rows) { warnings.push('Sheet "Challenges & Actions" not found — skipping challenges section'); return {}; }

  // Detect extended items format: check if col 3 (0-indexed) has a header-like value in row 4
  const col3Header = cell(rows, 4, 3).toLowerCase();
  const hasStatusQuarter = col3Header.includes('status') || col3Header.includes('quarter') || cell(rows, 4, 4);

  let items;
  if (hasStatusQuarter) {
    items = filterPlaceholders(
      rowObjects(rows, 5, 11, [0, 1, 2, 3, 4], ['location', 'challenge', 'action', 'status', 'quarter']),
      ['location', 'challenge', 'action']
    );
  } else {
    items = filterPlaceholders(
      rowObjects(rows, 5, 11, [0, 1, 2], ['location', 'challenge', 'action']),
      ['location', 'challenge', 'action']
    );
    // Normalize: add empty status/quarter
    items = items.map(r => ({ ...r, status: '', quarter: '' }));
  }

  // Detect 4-col priorFollowUp format: check header row 14 for "Location" in col 0
  const priorHeader = cell(rows, 14, 0).toLowerCase();
  const hasPriorLocation = priorHeader.includes('location');

  let priorFollowUp;
  if (hasPriorLocation) {
    priorFollowUp = filterPlaceholders(
      rowObjects(rows, 15, 18, [0, 1, 2, 3], ['location', 'action', 'status', 'notes']),
      ['action', 'status', 'notes']
    );
  } else {
    priorFollowUp = filterPlaceholders(
      rowObjects(rows, 15, 18, [0, 1, 2], ['action', 'status', 'notes']),
      ['action', 'status', 'notes']
    );
    // Normalize: add empty location
    priorFollowUp = priorFollowUp.map(r => ({ location: '', ...r }));
  }

  return {
    items: items.length ? items : [{ location: '', challenge: '', action: '', status: '', quarter: '' }],
    priorFollowUp: priorFollowUp.length
      ? priorFollowUp.map((r) => ({ ...r, status: r.status || 'In Progress' }))
      : [{ location: '', action: '', status: 'In Progress', notes: '' }],
  };
}

function parseFinancial(wb, warnings) {
  const rows = findSheet(wb, 'Financial');
  if (!rows) { warnings.push('Sheet "Financial" not found — skipping financial section'); return {}; }

  const strategyNotes = cellRange(rows, 15, 18, 1);

  return {
    asOfDate: dateCell(rows, 3, 1),
    totalOutstanding: currencyCell(rows, 4, 1),
    bucket30: currencyCell(rows, 8, 1),
    bucket60: currencyCell(rows, 9, 1),
    bucket90: currencyCell(rows, 10, 1),
    bucket91: currencyCell(rows, 11, 1),
    strategyNotes: strategyNotes.length ? strategyNotes : ['', ''],
  };
}

function parseRoadmap(wb, warnings) {
  const rows = findSheet(wb, 'Innovation & Roadmap');
  if (!rows) { warnings.push('Sheet "Innovation & Roadmap" not found — skipping roadmap section'); return {}; }

  const highlights = filterPlaceholders(
    rowObjects(rows, 5, 11, [0, 1, 2], ['innovation', 'description', 'benefit']),
    ['innovation', 'description', 'benefit']
  );
  const schedule = filterPlaceholders(
    rowObjects(rows, 15, 30, [0, 1, 2], ['month', 'initiative', 'details']),
    ['month', 'initiative', 'details']
  );

  return {
    highlights: highlights.length ? highlights : [{ innovation: '', description: '', benefit: '' }],
    photos: [],
    schedule: schedule.length ? schedule : [
      { month: 'Month 1', initiative: '', details: '' },
      { month: 'Month 2', initiative: '', details: '' },
      { month: 'Month 3', initiative: '', details: '' },
    ],
    goalStatement: concat(rows, 20, 21, 1),
  };
}

// ── Main Export ──────────────────────────────────────────

export async function parseQBUExcel(file) {
  const warnings = [];

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    const data = {
      cover: parseCover(wb, warnings),
      safety: parseSafety(wb, warnings),
      workTickets: parseWorkTickets(wb, warnings),
      audits: parseAudits(wb, warnings),
      executive: parseExecutive(wb, warnings),
      projects: parseProjects(wb, warnings),
      challenges: parseChallenges(wb, warnings),
      financial: parseFinancial(wb, warnings),
      roadmap: parseRoadmap(wb, warnings),
    };

    // Count populated sections
    const populated = Object.values(data).filter((section) => {
      return Object.values(section).some((v) => {
        if (Array.isArray(v)) return v.some((item) =>
          typeof item === 'string' ? item.length > 0 : Object.values(item).some((f) => f && f.length > 0)
        );
        return typeof v === 'string' && v.length > 0;
      });
    }).length;

    return { data, warnings, populated };
  } catch (err) {
    warnings.push(`Failed to parse Excel: ${err.message}`);
    return { data: {}, warnings, populated: 0 };
  }
}
