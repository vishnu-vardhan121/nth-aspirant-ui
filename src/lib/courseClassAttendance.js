/**
 * Sum CSV duration by email, classify vs free members and min duration.
 * @param {{ csvRows: {email:string,durationMinutes:number}[], freeMembers:{aspirant_id:string,email:string}[], minDurationMinutes:number }} args
 */
export function buildAttendancePayload({ csvRows, freeMembers, minDurationMinutes }) {
  const min = Math.max(1, Math.floor(Number(minDurationMinutes) || 0));
  const byEmail = new Map();
  for (const r of csvRows || []) {
    const email = String(r.email || '')
      .trim()
      .toLowerCase();
    if (!email) continue;
    const prev = byEmail.get(email) || 0;
    byEmail.set(email, prev + (Number(r.durationMinutes) || 0));
  }

  const memberByEmail = new Map();
  for (const m of freeMembers || []) {
    const email = String(m.email || '')
      .trim()
      .toLowerCase();
    if (!email) continue;
    memberByEmail.set(email, m.aspirant_id);
  }

  const rows = [];
  const seenMembers = new Set();

  for (const [email, duration] of byEmail) {
    const aspirantId = memberByEmail.get(email) || null;
    if (aspirantId) {
      seenMembers.add(email);
      rows.push({
        email,
        aspirant_id: aspirantId,
        duration_minutes: duration,
        status: duration >= min ? 'attended' : 'too_short',
      });
    } else {
      rows.push({
        email,
        aspirant_id: null,
        duration_minutes: duration,
        status: 'not_in_batch',
      });
    }
  }

  for (const [email, aspirantId] of memberByEmail) {
    if (seenMembers.has(email)) continue;
    rows.push({
      email,
      aspirant_id: aspirantId,
      duration_minutes: null,
      status: 'absent',
    });
  }

  const summary = { attended: 0, too_short: 0, not_in_batch: 0, absent: 0 };
  for (const r of rows) {
    if (summary[r.status] != null) summary[r.status] += 1;
  }
  return { rows, summary };
}
