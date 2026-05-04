/** Asia/Kolkata calendar date YYYY-MM-DD (aligned with public SQL date guards). */
export function calendarTodayIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * True when apply window has ended: prefers `application_deadline_at` (instant in time)
 * over legacy `application_deadline` (calendar day in IST).
 */
export function isApplyDeadlinePassed({ application_deadline_at: at, application_deadline: dateStr } = {}) {
  if (at != null && String(at).trim() !== '') {
    const ms = new Date(at).getTime();
    if (!Number.isNaN(ms)) return Date.now() >= ms;
  }
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d < calendarTodayIST();
  }
  const t = new Date(dateStr);
  if (Number.isNaN(t.getTime())) return false;
  const onIST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(t);
  return onIST < calendarTodayIST();
}

/** Milliseconds at which the apply window closes, or null if open-ended / unknown. */
export function applyDeadlineCloseMs({ application_deadline_at: at, application_deadline: deadlineRaw } = {}) {
  if (at != null && String(at).trim() !== '') {
    const ms = new Date(at).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (!deadlineRaw) return null;
  const ymd = String(deadlineRaw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const ms = new Date(`${ymd}T23:59:59.999+05:30`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Admin: combine date + optional local wall time (IST) into an ISO string for timestamptz. */
export function buildApplicationDeadlineAtIsoIst(dateStr, timeStr) {
  if (!dateStr || !String(dateStr).trim()) return null;
  const ymd = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const pad = (n) => String(Math.min(59, Math.max(0, n))).padStart(2, '0');
  const hasTime = timeStr && String(timeStr).trim();
  if (!hasTime) {
    return `${ymd}T23:59:59.999+05:30`;
  }
  const parts = String(timeStr).trim().slice(0, 5).split(':');
  const h = Math.min(23, parseInt(parts[0], 10) || 0);
  const m = Math.min(59, parseInt(parts[1], 10) || 0);
  return `${ymd}T${pad(h)}:${pad(m)}:00+05:30`;
}

/** Admin edit: split timestamptz into date + time inputs (wall clock in Asia/Kolkata). */
export function parseDeadlineAtForForm(iso) {
  if (!iso || !String(iso).trim()) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return { date: ymd, time: `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}` };
}

/** Short label for cards (IST when `at` is set). */
export function formatApplyDeadlineShort(at, dateFallback) {
  if (at != null && String(at).trim() !== '') {
    const d = new Date(at);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }
  if (!dateFallback) return null;
  const d2 = new Date(dateFallback);
  return Number.isNaN(d2.getTime())
    ? null
    : d2.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDurationParts(ms) {
  if (ms <= 0) return null;
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { days, h, m, s };
}
