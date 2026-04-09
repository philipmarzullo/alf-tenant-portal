// Small colored dot rendered next to a claim's work_status. The color
// reflects how WinTeam timekeeping compares to Liberty's value:
//   green  = confirmed   (timekeeping matches Liberty)
//   amber  = mismatch    (timekeeping contradicts Liberty — likely stale)
//   gray   = no_data     (employee not found in WinTeam timekeeping)
// Hover reveals a popover summarizing the underlying wt_* fields.
//
// Returns null if the claim has no validation state yet (never checked).

function fmtDay(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(ts) {
  if (!ts) return null;
  const then = new Date(ts).getTime();
  if (isNaN(then)) return null;
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function composeMessage(claim) {
  const state = claim.wt_validation_state;
  const lastDay = fmtDay(claim.wt_last_clocked_day);
  const hours = claim.wt_hours_last_14d != null ? Number(claim.wt_hours_last_14d) : null;
  const days = claim.wt_days_worked_last_14d;
  const jobs = claim.wt_jobs_worked_last_14d;
  const checked = formatRelativeTime(claim.wt_validation_checked_at);

  if (state === 'confirmed') {
    return {
      title: 'Verified by WinTeam',
      titleClass: 'text-green-300',
      lines: [
        lastDay ? `Last clocked: ${lastDay}` : 'No clock-ins in last 14 days',
        hours != null && days != null
          ? `${hours.toFixed(0)}h over ${days} day${days === 1 ? '' : 's'} (last 14 days)`
          : null,
        jobs ? `Jobs: ${jobs}` : null,
        checked ? `Checked ${checked}` : null,
      ].filter(Boolean),
    };
  }

  if (state === 'mismatch') {
    return {
      title: 'Possibly stale',
      titleClass: 'text-amber-300',
      lines: [
        claim.work_status ? `Liberty says: ${claim.work_status}` : null,
        lastDay ? `Last clocked: ${lastDay}` : null,
        hours != null && days != null
          ? `${hours.toFixed(0)}h over ${days} day${days === 1 ? '' : 's'} (last 14 days)`
          : null,
        jobs ? `Jobs: ${jobs}` : null,
        hours > 0 ? '→ May have returned to work' : '→ No timekeeping activity',
        checked ? `Checked ${checked}` : null,
      ].filter(Boolean),
    };
  }

  // no_data
  const empId = claim.employee_id;
  return {
    title: 'No WinTeam data',
    titleClass: 'text-gray-300',
    lines: [
      empId
        ? `Employee not found in WinTeam timekeeping. Verify employee ID ${empId} is correct.`
        : 'Claim has no employee_id — cannot validate against WinTeam.',
      checked ? `Checked ${checked}` : null,
    ].filter(Boolean),
  };
}

export default function ValidationDot({ claim }) {
  if (!claim || claim.wt_validation_state == null) return null;

  const state = claim.wt_validation_state;
  let dotCls = 'bg-gray-300';
  if (state === 'confirmed') dotCls = 'bg-green-500';
  else if (state === 'mismatch') dotCls = 'bg-amber-500';

  const msg = composeMessage(claim);

  return (
    <span className="relative group inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <span
        className={`inline-block w-2 h-2 rounded-full ${dotCls} cursor-help`}
        aria-label={msg.title}
      />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 px-3 py-2 bg-dark-nav text-white text-[11px] font-normal normal-case tracking-normal leading-snug rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
        <div className={`font-semibold mb-1 ${msg.titleClass}`}>{msg.title}</div>
        {msg.lines.map((line, i) => (
          <div key={i} className="text-white/90">{line}</div>
        ))}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-dark-nav" />
      </span>
    </span>
  );
}
