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

/**
 * Find the golden `course_members` row whose grant landed at the same moment the
 * aspirant's plan flipped to Gold (same DB transaction ⇒ same `now()`), so we can
 * tell "Gold from Golden Batch payment" apart from "Gold from a placement purchase".
 */
export async function getMyRecentGoldenCourseGrant(aspirantId, planStartedAt) {
  if (!aspirantId || !planStartedAt) return null;
  const { data, error } = await supabase
    .from('course_members')
    .select('course_id, updated_at, courses(title)')
    .eq('aspirant_id', aspirantId)
    .eq('status', 'golden')
    .order('updated_at', { ascending: false })
    .limit(5);
  if (error || !Array.isArray(data)) return null;

  const target = new Date(planStartedAt).getTime();
  if (!Number.isFinite(target)) return null;

  const match = data.find((row) => {
    const t = new Date(row.updated_at).getTime();
    return Number.isFinite(t) && Math.abs(t - target) < 10000;
  });
  if (!match) return null;

  return { courseId: match.course_id, courseTitle: match.courses?.title || '' };
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

/** G6: when premium/Golden phase starts for this course — lock free Play. */
export async function adminSetCourseRecordingsLocked(courseId, locked) {
  const { data, error } = await supabase.rpc('admin_set_course_recordings_locked', {
    p_course_id: courseId,
    p_locked: Boolean(locked),
  });
  return parseRpc(data, error);
}

export async function adminUpsertCourseGoldenTerms(courseId, { enabled, bullets }) {
  const seen = new Set();
  const list = [];
  for (const b of Array.isArray(bullets) ? bullets : []) {
    const item = String(b || '').trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
  }
  const { data, error } = await supabase.rpc('admin_upsert_course_golden_terms', {
    p_course_id: courseId,
    p_enabled: Boolean(enabled),
    p_bullets: list,
  });
  return parseRpc(data, error);
}

export async function adminGetCoursePricing(courseId) {
  const { data, error } = await supabase.rpc('admin_get_course_pricing', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function adminUpsertCoursePricing(courseId, payload) {
  const { data, error } = await supabase.rpc('admin_upsert_course_pricing', {
    p_course_id: courseId,
    p_full_amount_inr: Number(payload.fullAmountInr),
    p_two_amounts_inr: payload.twoAmountsInr,
    p_three_amounts_inr: payload.threeAmountsInr,
    p_upi_id: payload.upiId,
    p_upi_payee_name: payload.upiPayeeName,
    p_instructions: payload.instructions ?? null,
  });
  return parseRpc(data, error);
}

export async function getMyCoursePricing(courseId) {
  const { data, error } = await supabase.rpc('get_my_course_pricing', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function chooseCoursePack(courseId, pack) {
  const { data, error } = await supabase.rpc('choose_course_pack', {
    p_course_id: courseId,
    p_pack: pack,
  });
  return parseRpc(data, error);
}

export async function createCoursePaymentOrder(courseId) {
  const { data, error } = await supabase.rpc('create_course_payment_order', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function submitCoursePaymentProof(
  orderId,
  utr,
  payerNote = '',
  screenshotPath = null,
  senderName = '',
  senderUpiId = '',
  paymentApp = ''
) {
  const { data, error } = await supabase.rpc('submit_course_payment_proof', {
    p_order_id: orderId,
    p_utr: utr,
    p_payer_note: payerNote || null,
    p_screenshot_path: screenshotPath || null,
    p_sender_name: senderName || null,
    p_sender_upi_id: senderUpiId || null,
    p_payment_app: paymentApp || null,
  });
  return parseRpc(data, error);
}

const COURSE_PAYMENT_PROOFS_BUCKET = 'payment-proofs';

/** Upload course UPI proof into payment-proofs: {aspirantId}/course/{orderId}/proof.ext */
export async function uploadCoursePaymentScreenshot(aspirantId, orderId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'jpg';
  const path = `${aspirantId}/course/${orderId}/proof.${safeExt}`;
  const { error } = await supabase.storage.from(COURSE_PAYMENT_PROOFS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function getCoursePaymentScreenshotUrl(screenshotPath) {
  if (!screenshotPath) return { ok: false, error: 'No screenshot' };
  const { data, error } = await supabase.storage
    .from(COURSE_PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(screenshotPath, 3600);
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: data?.signedUrl || null };
}

export async function getMyCoursePaymentOrder(courseId) {
  const { data, error } = await supabase.rpc('get_my_course_payment_order', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function adminListCoursePaymentOrders(courseId, status = null) {
  const { data, error } = await supabase.rpc('admin_list_course_payment_orders', {
    p_course_id: courseId,
    p_status: status,
  });
  return parseRpc(data, error);
}

export async function adminReviewCoursePayment(orderId, approve, adminNotes = '') {
  const { data, error } = await supabase.rpc('admin_review_course_payment', {
    p_order_id: orderId,
    p_approve: approve,
    p_admin_notes: adminNotes || null,
  });
  return parseRpc(data, error);
}

export function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
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

export async function requestCourseGolden(courseId, reason = '', acceptedTerms = false) {
  const { data, error } = await supabase.rpc('request_course_golden', {
    p_course_id: courseId,
    p_reason: reason || null,
    p_accepted_terms: Boolean(acceptedTerms),
  });
  return parseRpc(data, error);
}

export async function staffListCourseGoldenRequests(courseId) {
  const { data, error } = await supabase.rpc('staff_list_course_golden_requests', {
    p_course_id: courseId,
  });
  return parseRpc(data, error);
}

export async function staffReviewCourseGolden(memberId, approve, reason) {
  const { data, error } = await supabase.rpc('staff_review_course_golden', {
    p_member_id: memberId,
    p_approve: approve,
    p_reason: reason,
  });
  return parseRpc(data, error);
}

export async function staffPartialApproveCourseGolden(memberId, reason) {
  const { data, error } = await supabase.rpc('staff_partial_approve_course_golden', {
    p_member_id: memberId,
    p_reason: reason,
  });
  return parseRpc(data, error);
}

/** Free-tier enrolled (includes mid Golden request / rejected / golden). */
export function isCourseEnrolledStatus(status) {
  return ['free', 'golden_requested', 'golden_rejected', 'golden'].includes(String(status || ''));
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

/** Convert Google Drive view/share links to /preview for iframe embed (10k-style). */
export function toDrivePreviewUrl(url) {
  const v = String(url || '').trim();
  if (v.length < 8) return null;
  if (/\/preview\/?(\?|$)/i.test(v)) return v.replace(/\?.*$/, '');
  const m = v.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if (/^https?:\/\//i.test(v)) return v;
  return null;
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

export async function getMyCourseClassWatch(classId) {
  const { data, error } = await supabase.rpc('get_my_course_class_watch', {
    p_class_id: classId,
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
    p_access_tier: payload.accessTier === 'golden' ? 'golden' : 'free',
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
    p_access_tier: payload.accessTier ?? null,
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
