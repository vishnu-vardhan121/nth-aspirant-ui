import { supabase } from './supabase';

function parseRpc(data, error) {
  if (error) return { ok: false, error: error.message };
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  if (!result?.ok) return { ok: false, error: result?.error || 'Request failed' };
  return result;
}

export async function listActiveCourses() {
  const { data, error } = await supabase.rpc('list_active_courses');
  return parseRpc(data, error);
}

export async function joinCourseFree(courseId) {
  const { data, error } = await supabase.rpc('join_course_free', { p_course_id: courseId });
  return parseRpc(data, error);
}

export async function requestCourseJoin(courseId, reason) {
  const { data, error } = await supabase.rpc('request_course_join', {
    p_course_id: courseId,
    p_reason: reason,
  });
  return parseRpc(data, error);
}

export async function adminListCourses() {
  const { data, error } = await supabase.rpc('admin_list_courses');
  return parseRpc(data, error);
}

export async function adminCreateCourse(payload) {
  const { data, error } = await supabase.rpc('admin_create_course', {
    p_code: payload.code,
    p_title: payload.title,
    p_free_starts_at: payload.freeStartsAt || null,
    p_free_ends_at: payload.freeEndsAt || null,
    p_premium_starts_at: payload.premiumStartsAt || null,
    p_premium_ends_at: payload.premiumEndsAt || null,
    p_is_active: payload.isActive ?? true,
  });
  return parseRpc(data, error);
}

export async function adminUpdateCourse(courseId, payload) {
  const { data, error } = await supabase.rpc('admin_update_course', {
    p_course_id: courseId,
    p_title: payload.title ?? null,
    p_free_starts_at: payload.freeStartsAt ?? null,
    p_free_ends_at: payload.freeEndsAt ?? null,
    p_premium_starts_at: payload.premiumStartsAt ?? null,
    p_premium_ends_at: payload.premiumEndsAt ?? null,
    p_is_active: payload.isActive ?? null,
  });
  return parseRpc(data, error);
}

export async function adminGetCourse(courseId) {
  const { data, error } = await supabase.rpc('admin_get_course', { p_course_id: courseId });
  return parseRpc(data, error);
}

export async function adminAddCourseInvites(courseId, emails) {
  const { data, error } = await supabase.rpc('admin_add_course_invites', {
    p_course_id: courseId,
    p_emails: emails,
  });
  return parseRpc(data, error);
}

export async function adminListCourseJoinRequests(courseId = null) {
  const { data, error } = await supabase.rpc('admin_list_course_join_requests', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function adminListCourseMembers(courseId, status = null) {
  const { data, error } = await supabase.rpc('admin_list_course_members', {
    p_course_id: courseId,
    p_status: status,
  });
  return parseRpc(data, error);
}

export async function adminReviewCourseJoin(memberId, approve) {
  const { data, error } = await supabase.rpc('admin_review_course_join', {
    p_member_id: memberId,
    p_approve: approve,
  });
  return parseRpc(data, error);
}

/** Split pasted emails by newline, comma, semicolon, tab, or spaces; also extract via regex. */
export function parseEmailList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const fromSplit = raw
    .split(/[\n\r,;\t\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@') && e.includes('.'));

  const fromRegex = [...raw.toLowerCase().matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)].map(
    (m) => m[0].toLowerCase()
  );

  return [...new Set([...fromSplit, ...fromRegex])];
}

const EMAIL_HEADER_RE = /^(e[\s_-]*mail|email\s*address|mail\s*id|emailid)$/i;

function findEmailColumnKey(row) {
  if (!row || typeof row !== 'object') return null;
  const keys = Object.keys(row);
  const exact = keys.find((k) => EMAIL_HEADER_RE.test(String(k).trim()));
  if (exact) return exact;
  const soft = keys.find((k) => /email/i.test(String(k)));
  return soft || null;
}

/**
 * Read .xlsx / .xls / .csv and pull emails from an email column (or any cell).
 * @param {File} file
 * @returns {Promise<{ ok: true, emails: string[], column: string | null, rowCount: number } | { ok: false, error: string }>}
 */
export async function extractEmailsFromSpreadsheet(file) {
  if (!file) return { ok: false, error: 'No file selected' };
  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { ok: false, error: 'Spreadsheet has no sheets' };
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return { ok: false, error: 'Spreadsheet is empty' };

    const emailKey = findEmailColumnKey(rows[0]);
    const collected = [];

    if (emailKey) {
      for (const row of rows) {
        const cell = String(row[emailKey] ?? '').trim();
        if (cell) collected.push(...parseEmailList(cell));
      }
    } else {
      for (const row of rows) {
        for (const value of Object.values(row)) {
          collected.push(...parseEmailList(String(value ?? '')));
        }
      }
    }

    const emails = [...new Set(collected)];
    if (emails.length === 0) {
      return {
        ok: false,
        error: emailKey
          ? `Found column "${emailKey}" but no valid emails`
          : 'No email column or valid emails found in the sheet',
      };
    }

    return {
      ok: true,
      emails,
      column: emailKey,
      rowCount: rows.length,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not read spreadsheet' };
  }
}

export function formatCourseDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Display class time in IST. */
export function formatClassDateTimeIst(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart} IST`;
}

/** Value for <input type="datetime-local"> from timestamptz, shown as IST. */
export function toDatetimeLocalIst(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Parse datetime-local as IST → ISO UTC string. */
export function istLocalInputToIso(localValue) {
  if (!localValue || typeof localValue !== 'string') return null;
  const trimmed = localValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return null;
  const d = new Date(`${trimmed}:00+05:30`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function listMyUpcomingCourseClasses() {
  const { data, error } = await supabase.rpc('list_my_upcoming_course_classes');
  return parseRpc(data, error);
}

export async function listMyCourseClassesBoard(courseId = null) {
  const { data, error } = await supabase.rpc('list_my_course_classes_board', {
    p_course_id: courseId || null,
  });
  return parseRpc(data, error);
}

export async function staffListCoursesForClasses() {
  const { data, error } = await supabase.rpc('staff_list_courses_for_classes');
  return parseRpc(data, error);
}

export async function staffListCourseClasses(courseId) {
  const { data, error } = await supabase.rpc('staff_list_course_classes', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function staffCreateCourseClass(payload) {
  const { data, error } = await supabase.rpc('staff_create_course_class', {
    p_course_id: payload.courseId,
    p_title: payload.title,
    p_starts_at: payload.startsAt,
    p_meet_url_1: payload.meetUrl1,
    p_meet_url_2: payload.meetUrl2 || null,
  });
  return parseRpc(data, error);
}

export async function staffUpdateCourseClass(id, payload) {
  const { data, error } = await supabase.rpc('staff_update_course_class', {
    p_id: id,
    p_title: payload.title ?? null,
    p_starts_at: payload.startsAt ?? null,
    p_meet_url_1: payload.meetUrl1 ?? null,
    p_meet_url_2: payload.meetUrl2 ?? null,
    p_clear_meet_url_2: Boolean(payload.clearMeetUrl2),
  });
  return parseRpc(data, error);
}

export async function staffDeleteCourseClass(id) {
  const { data, error } = await supabase.rpc('staff_delete_course_class', { p_id: id });
  return parseRpc(data, error);
}

export async function staffSaveCourseClassTopics(classId, coveredTopics) {
  const { data, error } = await supabase.rpc('staff_save_course_class_topics', {
    p_class_id: classId,
    p_covered_topics: coveredTopics,
  });
  return parseRpc(data, error);
}

export async function staffSaveCourseClassRecording(classId, recordingUrl) {
  const { data, error } = await supabase.rpc('staff_save_course_class_recording', {
    p_class_id: classId,
    p_recording_url: recordingUrl,
  });
  return parseRpc(data, error);
}

export async function staffListCourseClassFreeMembers(courseId) {
  const { data, error } = await supabase.rpc('staff_list_course_class_free_members', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function staffGetCourseClassSession(classId) {
  const { data, error } = await supabase.rpc('staff_get_course_class_session', {
    p_class_id: classId,
  });
  return parseRpc(data, error);
}

export async function staffUploadCourseClassAttendance(classId, minDurationMinutes, rows) {
  const { data, error } = await supabase.rpc('staff_upload_course_class_attendance', {
    p_class_id: classId,
    p_min_duration_minutes: minDurationMinutes,
    p_rows: rows,
  });
  return parseRpc(data, error);
}

export async function listMyCourseClassFollowups(courseId = null) {
  const { data, error } = await supabase.rpc('list_my_course_class_followups', {
    p_course_id: courseId || null,
  });
  return parseRpc(data, error);
}

export async function submitCourseClassDoubtRequest(classId, topics) {
  const { data, error } = await supabase.rpc('submit_course_class_doubt_request', {
    p_class_id: classId,
    p_topics: topics,
  });
  return parseRpc(data, error);
}

export async function submitCourseClassFeedback(classId, body) {
  const { data, error } = await supabase.rpc('submit_course_class_feedback', {
    p_class_id: classId,
    p_body: body,
  });
  return parseRpc(data, error);
}

export async function staffCreateCourseDoubtSession(payload) {
  const { data, error } = await supabase.rpc('staff_create_course_doubt_session', {
    p_class_id: payload.classId,
    p_title: payload.title,
    p_starts_at: payload.startsAt,
    p_meet_url: payload.meetUrl,
  });
  return parseRpc(data, error);
}

export async function staffUpdateCourseDoubtSession(payload) {
  const { data, error } = await supabase.rpc('staff_update_course_doubt_session', {
    p_id: payload.id,
    p_title: payload.title,
    p_starts_at: payload.startsAt,
    p_meet_url: payload.meetUrl,
  });
  return parseRpc(data, error);
}

export async function staffListCourseDoubtSessions(courseId) {
  const { data, error } = await supabase.rpc('staff_list_course_doubt_sessions', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function staffListCourseDoubtRequests(classId) {
  const { data, error } = await supabase.rpc('staff_list_course_doubt_requests', {
    p_class_id: classId,
  });
  return parseRpc(data, error);
}

export async function adminListCourseClassFeedback(courseId) {
  const { data, error } = await supabase.rpc('admin_list_course_class_feedback', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function adminListClassFeedback(classId) {
  const { data, error } = await supabase.rpc('admin_list_class_feedback', {
    p_class_id: classId,
  });
  return parseRpc(data, error);
}
