function normHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function pickEmailIdx(headers) {
  const prefs = ['user email', 'email', 'user email address'];
  for (const p of prefs) {
    const i = headers.findIndex((h) => h === p);
    if (i >= 0) return i;
  }
  return headers.findIndex((h) => h.includes('email'));
}

function pickDurationIdx(headers) {
  const i = headers.findIndex(
    (h) => h.includes('total duration') && (h.includes('minute') || h.includes('(minutes)'))
  );
  if (i >= 0) return i;
  return headers.findIndex((h) => h === 'total duration (minutes)');
}

function pickNameIdx(headers) {
  return headers.findIndex((h) => h.includes('name (original name)') || h === 'name');
}

/** Parse Zoom participants export; skip rows without email. */
export function parseZoomParticipantsCsv(text) {
  const raw = String(text || '')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!raw) return { ok: false, error: 'CSV is empty.' };
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return { ok: false, error: 'CSV needs a header and at least one row.' };
  const headers = splitCsvLine(lines[0]).map(normHeader);
  const emailIdx = pickEmailIdx(headers);
  const durIdx = pickDurationIdx(headers);
  if (emailIdx < 0) {
    return { ok: false, error: 'Could not find an email column (expected “User Email”).' };
  }
  if (durIdx < 0) {
    return { ok: false, error: 'Could not find “Total Duration (Minutes)” column.' };
  }
  const nameIdx = pickNameIdx(headers);
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li]);
    const email = String(cols[emailIdx] || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@')) continue;
    const durationMinutes = Number.parseInt(String(cols[durIdx] || '').trim(), 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) continue;
    const name = nameIdx >= 0 ? String(cols[nameIdx] || '').trim() || null : null;
    rows.push({ email, durationMinutes, name });
  }
  if (!rows.length) return { ok: false, error: 'No rows with email and duration found.' };
  return { ok: true, rows };
}
