import { useCallback, useEffect, useState } from 'react';
import { buildAttendancePayload } from '../../lib/courseClassAttendance';
import {
  staffGetCourseClassSession,
  staffListCourseClassFreeMembers,
  staffSaveCourseClassRecording,
  staffSaveCourseClassTopics,
  staffUploadCourseClassAttendance,
  toDrivePreviewUrl,
} from '../../lib/courses';
import { loadDraft, saveDraft } from '../../lib/draftStorage';
import { parseZoomParticipantsCsv } from '../../lib/zoomParticipantsCsv';
import StaffFormModal from './StaffFormModal';

const fieldClass =
  'w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base shadow-sm sm:rounded-md sm:py-2 sm:text-sm';

/** Covered topics only (≥3). */
export function CourseClassTopicsModal({ open, onClose, classId, classTitle, onSaved }) {
  const draftKey = classId ? `topics:${classId}` : '';
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [topics, setTopics] = useState(['', '', '']);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setHydrated(false);
    setMsg({ type: '', text: '' });
    const sessionRes = await staffGetCourseClassSession(classId);
    setLoading(false);
    if (!sessionRes.ok) {
      setMsg({ type: 'error', text: sessionRes.error || 'Failed to load' });
      setHydrated(true);
      return;
    }
    const cl = sessionRes.class || {};
    const existing = Array.isArray(cl.covered_topics) ? cl.covered_topics.map(String) : [];
    const padded = [...existing];
    while (padded.length < 3) padded.push('');
    const draft = loadDraft(draftKey, null);
    setTopics(Array.isArray(draft?.topics) && draft.topics.length ? draft.topics : padded);
    setHydrated(true);
  }, [classId, draftKey]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !draftKey || !hydrated || loading) return;
    saveDraft(draftKey, { topics });
  }, [topics, open, draftKey, hydrated, loading]);

  const saveTopics = async () => {
    setMsg({ type: '', text: '' });
    const list = topics.map((t) => t.trim()).filter(Boolean);
    if (list.length < 3) {
      setMsg({ type: 'error', text: 'Add at least 3 covered topics.' });
      return;
    }
    setBusy(true);
    const res = await staffSaveCourseClassTopics(classId, list);
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Failed to save topics' });
      return;
    }
    setMsg({ type: 'success', text: 'Topics saved.' });
    onSaved?.();
  };

  return (
    <StaffFormModal
      open={open}
      title="Covered topics"
      subtitle={classTitle}
      onClose={onClose}
      wide
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {msg.text ? (
            <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
              {msg.text}
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            Save at least 3 topics. Aspirants use these for doubt requests. Draft kept if you close.
          </p>
          {topics.map((t, i) => (
            <input
              key={i}
              type="text"
              value={t}
              onChange={(e) =>
                setTopics((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))
              }
              className={fieldClass}
              placeholder={`Topic ${i + 1}`}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTopics((arr) => [...arr, ''])}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              + Add topic
            </button>
            {topics.length > 3 ? (
              <button
                type="button"
                onClick={() => setTopics((arr) => arr.slice(0, -1))}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                Remove last
              </button>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveTopics}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save topics'}
          </button>
        </div>
      )}
    </StaffFormModal>
  );
}

/** Recording link + attendance CSV. */
export function CourseClassRecordingModal({
  open,
  onClose,
  classId,
  classTitle,
  onSaved,
}) {
  const draftKey = classId ? `recording:${classId}` : '';
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [recordingUrl, setRecordingUrl] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const demoSrc = toDrivePreviewUrl(recordingUrl);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setHydrated(false);
    setMsg({ type: '', text: '' });
    const sessionRes = await staffGetCourseClassSession(classId);
    setLoading(false);
    if (!sessionRes.ok) {
      setMsg({ type: 'error', text: sessionRes.error || 'Failed to load' });
      setHydrated(true);
      return;
    }
    const cl = sessionRes.class || {};
    const draft = loadDraft(draftKey, null);
    setRecordingUrl(
      draft?.recordingUrl != null && String(draft.recordingUrl).length
        ? draft.recordingUrl
        : cl.recording_url || ''
    );
    setHydrated(true);
  }, [classId, draftKey]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !draftKey || !hydrated || loading) return;
    saveDraft(draftKey, { recordingUrl });
  }, [recordingUrl, open, draftKey, hydrated, loading]);

  const saveRecording = async () => {
    setMsg({ type: '', text: '' });
    if (recordingUrl.trim().length < 8) {
      setMsg({ type: 'error', text: 'Paste a recording link.' });
      return;
    }
    setBusy(true);
    const res = await staffSaveCourseClassRecording(classId, recordingUrl.trim());
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Failed to save recording' });
      return;
    }
    setMsg({ type: 'success', text: 'Recording link saved.' });
    onSaved?.();
  };

  return (
    <StaffFormModal open={open} title="Recording" subtitle={classTitle} onClose={onClose} wide>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {msg.text ? (
            <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
              {msg.text}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            Paste the Drive share link — preview appears below so you can confirm it plays before
            students see it.
          </p>
          <input
            type="url"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
            className={fieldClass}
            placeholder="https://drive.google.com/file/d/…/view"
          />
          <button
            type="button"
            disabled={busy}
            onClick={saveRecording}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save recording'}
          </button>
          {!demoSrc && recordingUrl.trim() ? (
            <p className="text-xs text-amber-800">
              Couldn’t build a preview URL. Use a Google Drive file link (…/file/d/…/view).
            </p>
          ) : null}
          {demoSrc ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <p className="bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-300">
                Staff preview — same embed students get on the watch page
              </p>
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  key={demoSrc}
                  title="Recording demo preview"
                  src={demoSrc}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </StaffFormModal>
  );
}

export function CourseClassAttendanceModal({
  open,
  onClose,
  courseId,
  classId,
  classTitle,
  onSaved,
}) {
  const draftKey = classId ? `attendance:${classId}` : '';
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [minDuration, setMinDuration] = useState(30);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [preview, setPreview] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [csvName, setCsvName] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    if (!classId || !courseId) return;
    setLoading(true);
    setHydrated(false);
    setMsg({ type: '', text: '' });
    setCsvError('');
    setCsvName('');
    setPreview(null);
    const [sessionRes, membersRes] = await Promise.all([
      staffGetCourseClassSession(classId),
      staffListCourseClassFreeMembers(courseId),
    ]);
    setLoading(false);
    if (!sessionRes.ok) {
      setMsg({ type: 'error', text: sessionRes.error || 'Failed to load' });
      setHydrated(true);
      return;
    }
    const cl = sessionRes.class || {};
    const draft = loadDraft(draftKey, null);
    setMinDuration(
      draft?.minDuration != null ? draft.minDuration : cl.attendance_min_duration_minutes || 30
    );
    setAttendance(sessionRes.attendance || []);
    setMembers(membersRes.ok ? membersRes.members || [] : []);
    setHydrated(true);
  }, [classId, courseId, draftKey]);

  useEffect(() => {
    if (open) load();
    else setCsvName('');
  }, [open, load]);

  useEffect(() => {
    if (!open || !draftKey || !hydrated || loading) return;
    saveDraft(draftKey, { minDuration });
  }, [minDuration, open, draftKey, hydrated, loading]);

  const onCsvFile = async (file) => {
    setCsvError('');
    setPreview(null);
    setCsvName(file?.name || '');
    if (!file) return;
    const text = await file.text();
    const parsed = parseZoomParticipantsCsv(text);
    if (!parsed.ok) {
      setCsvError(parsed.error || 'Invalid CSV');
      return;
    }
    setPreview(
      buildAttendancePayload({
        csvRows: parsed.rows,
        freeMembers: members,
        minDurationMinutes: Number(minDuration) || 30,
      })
    );
  };

  const saveAttendance = async () => {
    setMsg({ type: '', text: '' });
    if (!preview?.rows?.length) {
      setMsg({ type: 'error', text: 'Upload a Zoom participants CSV first.' });
      return;
    }
    const min = Number(minDuration);
    if (!Number.isFinite(min) || min < 1) {
      setMsg({ type: 'error', text: 'Min duration must be at least 1 minute.' });
      return;
    }
    setBusy(true);
    const res = await staffUploadCourseClassAttendance(classId, min, preview.rows);
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: 'error', text: res.error || 'Failed to save attendance' });
      return;
    }
    setMsg({
      type: 'success',
      text: `Attendance saved (${res.saved_count || preview.rows.length} rows).`,
    });
    setAttendance(preview.rows);
    onSaved?.();
  };

  return (
    <StaffFormModal open={open} title="Attendance" subtitle={classTitle} onClose={onClose} wide>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {msg.text ? (
            <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
              {msg.text}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            Zoom export with User Email + Total Duration (Minutes). Draft for min duration is kept
            if you close.
          </p>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Min duration (minutes)</label>
            <input
              type="number"
              min={1}
              value={minDuration}
              onChange={(e) => {
                setMinDuration(e.target.value);
                setPreview(null);
              }}
              className={fieldClass}
            />
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center hover:border-indigo-300 hover:bg-indigo-50/40">
            <span className="text-sm font-semibold text-slate-800">
              {csvName ? 'Change CSV file' : 'Upload Zoom participants CSV'}
            </span>
            <span className="text-xs text-slate-500">
              {csvName || '.csv from Zoom · User Email + Total Duration'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => onCsvFile(e.target.files?.[0])}
            />
          </label>
          {csvError ? <p className="text-sm text-red-600">{csvError}</p> : null}
          {preview ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p>
                Attended {preview.summary.attended} · Too short {preview.summary.too_short} · Not in
                batch {preview.summary.not_in_batch} · Absent {preview.summary.absent}
              </p>
              <div className="mt-2 max-h-40 overflow-y-auto">
                <table className="w-full text-left">
                  <tbody>
                    {preview.rows.slice(0, 40).map((r) => (
                      <tr key={`${r.email}-${r.status}`} className="border-t border-slate-200">
                        <td className="py-1 pr-2">{r.email}</td>
                        <td className="py-1 pr-2">{r.duration_minutes ?? '—'}</td>
                        <td className="py-1">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : attendance.length ? (
            <p className="text-xs text-slate-500">
              {attendance.length} attendance rows already saved.
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy || !preview}
            onClick={saveAttendance}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save attendance'}
          </button>
        </div>
      )}
    </StaffFormModal>
  );
}
