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

// ── Placeholder / Header Row Filtering ───────────────────

const PLACEHOLDER_WORDS = new Set([
  'name', 'title', 'location', 'quote', 'attribution', 'attribution (name & title)',
  'name & title', 'hazard', 'action', 'notified', 'challenge', 'notes',
  'description', 'innovation', 'benefit', 'initiative', 'details', 'month', 'event', 'event / context',
  'category', 'client team attendees', 'a&a team attendees', 'a&a team',
  'client team', 'date', 'cause', 'treatment', 'return to work date',
  'corrective action', 'hazard prevented', 'who notified', 'status',
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

  const aaTeam = filterTeam(rowObjects(rows, 11, 25, [0, 1], ['name', 'title']));
  const clientTeam = filterTeam(rowObjects(rows, 27, 40, [0, 1], ['name', 'title']));

  return {
    clientName: cell(rows, 3, 1),
    quarter: cell(rows, 4, 1),
    date: dateCell(rows, 5, 1),
    jobName: cell(rows, 6, 1),
    jobNumber: cell(rows, 7, 1),
    regionVP: cell(rows, 8, 1),
    aaTeam: aaTeam.length ? aaTeam : [{ name: '', title: '' }],
    clientTeam: clientTeam.length ? clientTeam : [{ name: '', title: '' }],
  };
}

function parseSafety(wb, warnings) {
  const rows = findSheet(wb, 'Safety');
  if (!rows) { warnings.push('Sheet "Safety" not found — skipping safety section'); return {}; }

  // Safety Metrics (rows 11-13 in new template)
  const safetyInspections = cell(rows, 11, 1);
  const goodSaveCount = cell(rows, 12, 1);
  const recordableCount = cell(rows, 13, 1);

  // Recordable Incidents by Quarter (rows 18-21, shifted +6 from old rows 12-15)
  const incidents = filterPlaceholders(
    rowObjects(rows, 18, 22, [0, 1, 2, 3, 4], ['location', 'q1', 'q2', 'q3', 'q4']),
    ['location']
  );
  // Good Saves (rows 27-32, shifted +6 from old rows 21-26)
  const goodSaves = filterPlaceholders(
    rowObjects(rows, 27, 32, [0, 1, 2, 3], ['location', 'hazard', 'action', 'notified']),
    ['location', 'hazard', 'action', 'notified']
  );
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
    keyTips: cell(rows, 5, 1),
    quickReminders: cell(rows, 6, 1),
    whyItMatters: cell(rows, 7, 1),
    safetyInspections,
    goodSaveCount,
    recordableCount,
    incidents: incidents.length ? incidents : [{ location: '', q1: '', q2: '', q3: '', q4: '' }],
    goodSaves: goodSaves.length ? goodSaves : [{ location: '', hazard: '', action: '', notified: '' }],
    incidentDetails: incidentDetails.length ? incidentDetails : [{ location: '', date: '', cause: '', treatment: '', returnDate: '' }],
  };
}

function parseWorkTickets(wb, warnings) {
  const rows = findSheet(wb, 'Work Tickets');
  if (!rows) { warnings.push('Sheet "Work Tickets" not found — skipping work tickets section'); return {}; }

  const locations = filterPlaceholders(
    rowObjects(rows, 5, 8, [0, 1, 2], ['location', 'priorYear', 'currentYear']),
    ['location']
  );

  return {
    locations: locations.length ? locations : [{ location: '', priorYear: '', currentYear: '' }],
    keyTakeaway: cell(rows, 11, 1),
    eventsSupported: concat(rows, 14, 30, 1),
  };
}

function parseAudits(wb, warnings) {
  const rows = findSheet(wb, 'Audits & Actions');
  if (!rows) { warnings.push('Sheet "Audits & Actions" not found — skipping audits section'); return {}; }

  const AREAS = ['Restrooms', 'Common Areas', 'Classrooms', 'Cafeteria', 'Stairwells', 'Other'];
  const topAreas = AREAS.map((area, i) => ({
    area,
    count: cell(rows, 16 + i, 1),
  }));

  return {
    locationNames: [cell(rows, 4, 1), cell(rows, 4, 2), cell(rows, 4, 3)],
    priorAudits: [cell(rows, 5, 1), cell(rows, 5, 2), cell(rows, 5, 3)],
    priorActions: [cell(rows, 6, 1), cell(rows, 6, 2), cell(rows, 6, 3)],
    currentAudits: [cell(rows, 7, 1), cell(rows, 7, 2), cell(rows, 7, 3)],
    currentActions: [cell(rows, 8, 1), cell(rows, 8, 2), cell(rows, 8, 3)],
    auditExplanation: cell(rows, 10, 1),
    actionExplanation: cell(rows, 11, 1),
    topAreas,
  };
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

  const completed = rowObjects(rows, 5, 13, [0, 1], ['category', 'description'])
    .filter((r) => r.description && !isPlaceholder(r.description) && !isPlaceholder(r.category));

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
    completed: completed.length ? completed : [{ category: 'Renovation/Deep Clean', description: '' }],
    photos: [],
    testimonials: testimonials.length ? testimonials : [{ location: '', event: '', quote: '', attribution: '' }],
  };
}

function parseChallenges(wb, warnings) {
  const rows = findSheet(wb, 'Challenges & Actions');
  if (!rows) { warnings.push('Sheet "Challenges & Actions" not found — skipping challenges section'); return {}; }

  const items = filterPlaceholders(
    rowObjects(rows, 5, 11, [0, 1, 2], ['location', 'challenge', 'action']),
    ['location', 'challenge', 'action']
  );
  const priorFollowUp = filterPlaceholders(
    rowObjects(rows, 15, 18, [0, 1, 2], ['action', 'status', 'notes']),
    ['action', 'status', 'notes']
  );

  return {
    items: items.length ? items : [{ location: '', challenge: '', action: '' }],
    priorFollowUp: priorFollowUp.length
      ? priorFollowUp.map((r) => ({ ...r, status: r.status || 'In Progress' }))
      : [{ action: '', status: 'In Progress', notes: '' }],
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
