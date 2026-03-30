/**
 * Period-aware helpers for QBU (Business Review) generation.
 * Supports quarterly, bi-annual (H1/H2), and annual review types.
 */

/** Normalize reviewType from form or parsed value */
export function getReviewType(form) {
  const raw = (form?.cover?.reviewType || 'quarterly').toLowerCase().trim();
  if (raw.includes('annual') && !raw.includes('bi')) return 'annual';
  if (raw.includes('bi') || raw.includes('semi') || raw === 'biannual') return 'biannual';
  return 'quarterly';
}

/** Full title for cover slide subtitle */
export function getPeriodTitle(form) {
  const type = getReviewType(form);
  if (type === 'annual') return 'Annual Business Update';
  if (type === 'biannual') return 'Bi-Annual Business Update';
  return 'Quarterly Business Update';
}

/** Short period reference for narrative text */
export function getPeriodShort(form) {
  const type = getReviewType(form);
  if (type === 'annual') return 'this year';
  if (type === 'biannual') return 'this period';
  return 'this quarter';
}

/** Label for the "no data" message (e.g. "No projects reported this quarter/period/year") */
export function getPeriodNoun(form) {
  const type = getReviewType(form);
  if (type === 'annual') return 'year';
  if (type === 'biannual') return 'period';
  return 'quarter';
}

/** Calculate the next period label from the current cover.quarter value */
export function getNextPeriodLabel(form) {
  const type = getReviewType(form);
  const q = form?.cover?.quarter || '';

  if (type === 'annual') {
    const yearMatch = q.match(/\d{4}/);
    return yearMatch ? `Annual ${Number(yearMatch[0]) + 1}` : '';
  }

  if (type === 'biannual') {
    const match = q.match(/H(\d)\s*(\d{4})/);
    if (match) {
      const half = Number(match[1]);
      const year = Number(match[2]);
      return half === 1 ? `H2 ${year}` : `H1 ${year + 1}`;
    }
    return '';
  }

  // Quarterly — existing logic
  return q.replace(/Q(\d)(\s*(\d{4}))?/, (_, n, __, y) => {
    const nextNum = (Number(n) % 4) + 1;
    if (y) {
      const nextYear = nextNum === 1 ? Number(y) + 1 : Number(y);
      return `Q${nextNum} ${nextYear}`;
    }
    return `Q${nextNum}`;
  });
}

/**
 * Determine which Q1-Q4 columns are "active" for the review period.
 * Returns an array of quarter keys, e.g. ['q1'] or ['q1','q2'] or ['q1','q2','q3','q4'].
 */
export function getPeriodColumns(form) {
  const type = getReviewType(form);
  const q = form?.cover?.quarter || '';

  if (type === 'annual') return ['q1', 'q2', 'q3', 'q4'];

  if (type === 'biannual') {
    const match = q.match(/H(\d)/i);
    if (match) {
      return Number(match[1]) === 1 ? ['q1', 'q2'] : ['q3', 'q4'];
    }
    return ['q1', 'q2']; // default to H1
  }

  // Quarterly — single column
  const qMatch = q.match(/Q(\d)/i);
  if (qMatch) return [`q${qMatch[1]}`];
  return ['q1'];
}

/** Build prior year period label from current period for YoY comparison */
export function getPriorPeriodLabel(form) {
  const q = form?.cover?.quarter || '';
  const yearMatch = q.match(/\d{4}/);
  if (!yearMatch) return q ? `${q} (Prior Year)` : 'Prior Year';
  return q.replace(yearMatch[0], String(Number(yearMatch[0]) - 1));
}
