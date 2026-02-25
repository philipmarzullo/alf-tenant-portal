import * as XLSX from 'xlsx';

// ── Helpers ──────────────────────────────────────────────

function cell(rows, r, c) {
  const val = rows?.[r - 1]?.[c] ?? '';
  return typeof val === 'number' ? String(val) : (val || '').toString().trim();
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

// ── Section Parsers ──────────────────────────────────────

function parseCover(wb, warnings) {
  const rows = findSheet(wb, 'Cover & Intros');
  if (!rows) { warnings.push('Sheet "Cover & Intros" not found — skipping cover section'); return {}; }

  const aaTeam = rowObjects(rows, 11, 19, [0, 1], ['name', 'title']);
  const clientTeam = rowObjects(rows, 21, 27, [0, 1], ['name', 'title']);

  return {
    clientName: cell(rows, 3, 1),
    quarter: cell(rows, 4, 1),
    date: cell(rows, 5, 1),
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

  const incidents = rowObjects(rows, 11, 15, [0, 1, 2, 3, 4], ['location', 'q1', 'q2', 'q3', 'q4']);
  const goodSaves = rowObjects(rows, 20, 26, [0, 1, 2, 3], ['location', 'hazard', 'action', 'notified']);
  const incidentDetails = rowObjects(rows, 29, 32, [0, 1, 2, 3, 4], ['location', 'date', 'cause', 'treatment', 'returnDate']);

  return {
    theme: cell(rows, 4, 1),
    keyTips: cell(rows, 5, 1),
    quickReminders: cell(rows, 6, 1),
    whyItMatters: cell(rows, 7, 1),
    incidents: incidents.length ? incidents : [{ location: '', q1: '', q2: '', q3: '', q4: '' }],
    goodSaves: goodSaves.length ? goodSaves : [{ location: '', hazard: '', action: '', notified: '' }],
    incidentDetails: incidentDetails.length ? incidentDetails : [{ location: '', date: '', cause: '', treatment: '', returnDate: '' }],
  };
}

function parseWorkTickets(wb, warnings) {
  const rows = findSheet(wb, 'Work Tickets');
  if (!rows) { warnings.push('Sheet "Work Tickets" not found — skipping work tickets section'); return {}; }

  const locations = rowObjects(rows, 5, 8, [0, 1, 2], ['location', 'priorYear', 'currentYear']);

  return {
    locations: locations.length ? locations : [{ location: '', priorYear: '', currentYear: '' }],
    keyTakeaway: cell(rows, 11, 1),
    eventsSupported: concat(rows, 14, 15, 1),
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
    .filter((r) => r.description);

  // Rows 17-25 are photo references — warn user to upload separately
  let hasPhotoRefs = false;
  for (let r = 17; r <= 25; r++) {
    if (cell(rows, r, 0) || cell(rows, r, 1)) { hasPhotoRefs = true; break; }
  }
  if (hasPhotoRefs) warnings.push('Excel contains photo references (rows 17-25) — upload actual photos in the Photos section');

  const testimonials = rowObjects(rows, 28, 32, [0, 1, 2], ['location', 'quote', 'attribution']);

  return {
    completed: completed.length ? completed : [{ category: 'Renovation/Deep Clean', description: '' }],
    photos: [],
    testimonials: testimonials.length ? testimonials : [{ location: '', quote: '', attribution: '' }],
  };
}

function parseChallenges(wb, warnings) {
  const rows = findSheet(wb, 'Challenges & Actions');
  if (!rows) { warnings.push('Sheet "Challenges & Actions" not found — skipping challenges section'); return {}; }

  const items = rowObjects(rows, 5, 11, [0, 1, 2], ['location', 'challenge', 'action']);
  const priorFollowUp = rowObjects(rows, 15, 18, [0, 1, 2], ['action', 'status', 'notes']);

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
    asOfDate: cell(rows, 3, 1),
    totalOutstanding: cell(rows, 4, 1),
    bucket30: cell(rows, 8, 1),
    bucket60: cell(rows, 9, 1),
    bucket90: cell(rows, 10, 1),
    bucket91: cell(rows, 11, 1),
    strategyNotes: strategyNotes.length ? strategyNotes : ['', ''],
  };
}

function parseRoadmap(wb, warnings) {
  const rows = findSheet(wb, 'Innovation & Roadmap');
  if (!rows) { warnings.push('Sheet "Innovation & Roadmap" not found — skipping roadmap section'); return {}; }

  const highlights = rowObjects(rows, 5, 11, [0, 1, 2], ['innovation', 'description', 'benefit']);
  const schedule = rowObjects(rows, 15, 17, [0, 1, 2], ['month', 'initiative', 'details']);

  return {
    highlights: highlights.length ? highlights : [{ innovation: '', description: '', benefit: '' }],
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
