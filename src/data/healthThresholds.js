/**
 * Department Health threshold rules for the Command Center.
 * Each domain maps to a metric from the home-summary hero data
 * (sourced from live ops-workspace endpoints).
 *
 * - "min" means >= threshold is that level (higher is better)
 * - "max" means <= threshold is that level (lower is better)
 * - invertColor: true when lower values are better
 */
export const HEALTH_THRESHOLDS = {
  operations: {
    metric: 'qualityPassRate',
    label: 'Quality Pass Rate',
    format: 'percent',
    green: { min: 90 },
    yellow: { min: 80 },
  },
  labor: {
    metric: 'overtimePct',
    label: 'Overtime %',
    format: 'percent',
    green: { max: 10 },
    yellow: { max: 15 },
    invertColor: true,
  },
  quality: {
    metric: 'openDeficiencies',
    label: 'Open Deficiencies',
    format: 'number',
    green: { max: 5 },
    yellow: { max: 15 },
    invertColor: true,
  },
  safety: {
    metric: 'openClaims',
    label: 'Open Claims',
    format: 'number',
    green: { max: 2 },
    yellow: { max: 5 },
    invertColor: true,
  },
};

/**
 * Compute health status for a domain given hero data from home-summary.
 *
 * @param {string} domain - e.g. 'operations'
 * @param {object} hero - hero data from home-summary response
 * @returns {{ status: 'green'|'yellow'|'red', label: string, metric: string, value: number|null, format: string }}
 */
export function computeHealth(domain, hero) {
  const config = HEALTH_THRESHOLDS[domain];
  if (!config) return { status: 'green', label: 'Healthy', metric: domain, value: null, format: 'number' };

  const rawValue = hero?.[config.metric];
  if (rawValue == null) {
    return { status: 'green', label: 'No Data', metric: config.label, value: null, format: config.format };
  }

  const testValue = config.useAbsolute ? Math.abs(rawValue) : rawValue;
  let status = 'red';

  if (config.green.min != null) {
    // Higher is better: green >= min, yellow >= min, else red
    if (testValue >= config.green.min) status = 'green';
    else if (testValue >= config.yellow.min) status = 'yellow';
  } else if (config.green.max != null) {
    // Lower is better: green <= max, yellow <= max, else red
    if (testValue <= config.green.max) status = 'green';
    else if (testValue <= config.yellow.max) status = 'yellow';
  }

  const labels = { green: 'Healthy', yellow: 'Watch', red: 'Critical' };

  return {
    status,
    label: labels[status],
    metric: config.label,
    value: rawValue,
    format: config.format,
  };
}
