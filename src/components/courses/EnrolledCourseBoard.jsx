import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  HiCalendarDays,
  HiCheckCircle,
  HiChatBubbleLeftRight,
  HiPencilSquare,
  HiPlayCircle,
  HiVideoCamera,
  HiXMark,
} from 'react-icons/hi2';
import {
  formatClassDateTimeIst,
  listMyCourseClassesBoard,
  submitCourseClassDoubtRequest,
  submitCourseClassFeedback,
} from '../../lib/courses';
import { clearDraft, loadDraft, saveDraft } from '../../lib/draftStorage';
import { useAppSelector } from '../../store/hooks';
import JoinLiveClassModal from './JoinLiveClassModal';

const FULL_ROOM_HINT = 'If this meeting is full, use the other link.';

const btnPrimary =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60';
const btnSecondary =
  'inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60';

function classDateParts(iso) {
  if (!iso) return { day: '—', month: '', weekday: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: '—', month: '', weekday: '', time: '' };
  const fmt = (opts) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(d);
  return {
    day: fmt({ day: '2-digit' }),
    month: fmt({ month: 'short' }),
    weekday: fmt({ weekday: 'short' }),
    time: fmt({ hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

/**
 * Joined-student board: elevated class cards; feedback & doubt open in modals.
 */
export default function EnrolledCourseBoard({ courseId }) {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const registeredEmail =
    String(aspirantProfile?.email || user?.email || '')
      .trim()
      .toLowerCase() || '';

  const [upcoming, setUpcoming] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinPrompt, setJoinPrompt] = useState(null);
  const [doubtClass, setDoubtClass] = useState(null);
  const [feedbackClass, setFeedbackClass] = useState(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    const res = await listMyCourseClassesBoard(courseId);
    setLoading(false);
    if (!res.ok) {
      setUpcoming([]);
      setCompleted([]);
      return;
    }
    setUpcoming(res.upcoming || []);
    setCompleted(res.completed || []);
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading your classes…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHead
          icon={HiVideoCamera}
          iconClass="text-indigo-600"
          title="Upcoming"
          count={upcoming.length}
        />
        {upcoming.length === 0 ? (
          <EmptyCard
            title="No upcoming class yet"
            text="When the next live session is posted, join links show up here."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((row, i) => (
              <UpcomingClassCard
                key={row.id}
                row={row}
                index={i}
                onJoin={(meetUrl) => setJoinPrompt({ meetUrl })}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionHead
          icon={HiCheckCircle}
          iconClass="text-emerald-600"
          title="Completed"
          count={`${completed.length} · recent first`}
        />
        {completed.length === 0 ? (
          <EmptyCard
            title="No completed classes yet"
            text="After a class day passes, it moves here. Use the buttons for feedback and doubt."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {completed.map((row, i) => (
              <CompletedClassCard
                key={row.id}
                row={row}
                index={i}
                onDoubt={() => setDoubtClass(row)}
                onFeedback={() => setFeedbackClass(row)}
                onJoinDoubt={(meetUrl) => setJoinPrompt({ meetUrl })}
              />
            ))}
          </ul>
        )}
      </section>

      <JoinLiveClassModal
        open={Boolean(joinPrompt)}
        email={registeredEmail}
        meetUrl={joinPrompt?.meetUrl || ''}
        linkLabel="I’ve joined with this email — Open"
        onClose={() => setJoinPrompt(null)}
      />

      <DoubtRequestModal
        row={doubtClass}
        onClose={() => setDoubtClass(null)}
        onSaved={() => {
          setDoubtClass(null);
          load();
        }}
      />

      <FeedbackModal
        row={feedbackClass}
        onClose={() => setFeedbackClass(null)}
        onSaved={() => {
          setFeedbackClass(null);
          load();
        }}
      />
    </div>
  );
}

function SectionHead({ icon: Icon, iconClass, title, count }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden />
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      <span className="text-xs font-medium tabular-nums text-slate-500">{count}</span>
    </div>
  );
}

function CardShell({ children, accent = 'slate', index = 0 }) {
  const accents = {
    indigo: 'from-indigo-600 via-indigo-500 to-violet-600',
    emerald: 'from-emerald-600 via-teal-600 to-cyan-700',
    slate: 'from-slate-700 to-slate-600',
  };
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.04 * index, 0.28) }}
      className="flex min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/8 ring-1 ring-slate-900/5"
    >
      <div className={`h-1.5 bg-gradient-to-r ${accents[accent] || accents.slate}`} aria-hidden />
      {children}
    </motion.li>
  );
}

function DateBadge({ iso, tone = 'indigo' }) {
  const parts = classDateParts(iso);
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-900 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
  };
  return (
    <div
      className={`flex min-w-[3.75rem] flex-col items-center justify-center rounded-xl px-2.5 py-2 ring-1 ${
        tones[tone] || tones.indigo
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{parts.month}</span>
      <span className="text-xl font-extrabold leading-none tabular-nums">{parts.day}</span>
      <span className="mt-0.5 text-[10px] font-semibold opacity-70">{parts.weekday}</span>
    </div>
  );
}

function UpcomingClassCard({ row, index, onJoin }) {
  const hasTwo = Boolean(String(row.meet_url_2 || '').trim());
  const parts = classDateParts(row.starts_at);
  const doubtSessions = Array.isArray(row.class_doubt_sessions) ? row.class_doubt_sessions : [];

  return (
    <CardShell accent="indigo" index={index}>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex gap-3">
          <DateBadge iso={row.starts_at} tone="indigo" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Upcoming
            </span>
            <p className="mt-1.5 text-[15px] font-bold leading-snug text-slate-900">{row.title}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <HiCalendarDays className="h-3.5 w-3.5" aria-hidden />
              {parts.time} IST
            </p>
          </div>
        </div>
        {hasTwo ? <p className="mt-3 text-xs leading-relaxed text-slate-500">{FULL_ROOM_HINT}</p> : null}

        {doubtSessions.length ? (
          <DoubtSessionBlock sessions={doubtSessions} onJoin={onJoin} />
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {hasTwo ? (
            <>
              <button type="button" className={btnPrimary} onClick={() => onJoin(row.meet_url_1)}>
                Join — Link 1
              </button>
              <button type="button" className={btnSecondary} onClick={() => onJoin(row.meet_url_2)}>
                Join — Link 2
              </button>
            </>
          ) : (
            <button type="button" className={btnPrimary} onClick={() => onJoin(row.meet_url_1)}>
              Join live class
            </button>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function CompletedClassCard({ row, index, onDoubt, onFeedback, onJoinDoubt }) {
  const topics = Array.isArray(row.covered_topics) ? row.covered_topics : [];
  const hasTopics = topics.length >= 3;
  const locked = row.my_request_status === 'notified';
  const sessions = Array.isArray(row.class_doubt_sessions)
    ? row.class_doubt_sessions
    : Array.isArray(row.my_doubt_sessions)
      ? row.my_doubt_sessions
      : [];
  const hasDoubtScheduled = sessions.length > 0;
  const hasFb = Boolean(String(row.my_feedback || '').trim());
  const parts = classDateParts(row.starts_at);

  return (
    <CardShell accent="emerald" index={index}>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex gap-3">
          <DateBadge iso={row.starts_at} tone="emerald" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Completed
            </span>
            <p className="mt-1.5 text-[15px] font-bold leading-snug text-slate-900">{row.title}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <HiCalendarDays className="h-3.5 w-3.5" aria-hidden />
              {parts.time} IST
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {hasTopics ? (
            <Chip tone="emerald">{topics.length} topics</Chip>
          ) : (
            <Chip tone="slate">Topics soon</Chip>
          )}
          {row.has_recording ? <Chip tone="indigo">Recording</Chip> : null}
          {hasFb ? <Chip tone="amber">Feedback sent</Chip> : null}
          {row.my_request_status === 'pending' ? <Chip tone="indigo">Doubt requested</Chip> : null}
          {hasDoubtScheduled ? <Chip tone="indigo">Doubt session scheduled</Chip> : null}
        </div>

        {row.has_recording ? (
          <Link
            to={`/dashboard/courses/class/${row.id}/watch`}
            className={`${btnPrimary} mt-3 gap-1.5`}
          >
            <HiPlayCircle className="h-5 w-5" aria-hidden />
            Play recording
          </Link>
        ) : null}

        {hasDoubtScheduled ? (
          <DoubtSessionBlock sessions={sessions} onJoin={onJoinDoubt} />
        ) : null}

        <div className="mt-auto grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onFeedback}
            className={`${btnSecondary} gap-1.5`}
          >
            <HiPencilSquare className="h-4 w-4" aria-hidden />
            {hasFb ? 'Edit feedback' : 'Give feedback'}
          </button>
          <button
            type="button"
            onClick={onDoubt}
            disabled={!hasTopics && !locked && !hasDoubtScheduled}
            className={`${btnPrimary} gap-1.5`}
            title={!hasTopics ? 'Topics not posted yet' : undefined}
          >
            <HiChatBubbleLeftRight className="h-4 w-4" aria-hidden />
            {locked || hasDoubtScheduled ? 'Doubt topics' : 'Request doubt'}
          </button>
        </div>
      </div>
    </CardShell>
  );
}

function DoubtSessionBlock({ sessions, onJoin }) {
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-indigo-50 px-3 py-2.5 ring-1 ring-indigo-100">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-900">
        Doubt session scheduled
      </p>
      {sessions.map((ds) => (
        <div key={ds.id} className="flex flex-col gap-2 border-t border-indigo-100 pt-2 first:border-0 first:pt-0">
          <div>
            <p className="text-sm font-medium text-slate-900">{ds.title}</p>
            <p className="text-xs text-slate-600">{formatClassDateTimeIst(ds.starts_at)}</p>
          </div>
          <button type="button" className={btnPrimary} onClick={() => onJoin(ds.meet_url)}>
            Join doubt session
          </button>
        </div>
      ))}
    </div>
  );
}

function Chip({ children, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-900 ring-amber-100',
    indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
}

function ModalFrame({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function DoubtRequestModal({ row, onClose, onSaved }) {
  const draftKey = row?.id ? `aspirant-doubt:${row.id}` : '';
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!row) {
      setHydrated(false);
      return;
    }
    const draft = loadDraft(draftKey, null);
    if (Array.isArray(draft?.topics)) {
      setPicked(new Set(draft.topics));
    } else {
      setPicked(new Set(Array.isArray(row.my_request_topics) ? row.my_request_topics : []));
    }
    setError('');
    setHydrated(true);
  }, [row, draftKey]);

  useEffect(() => {
    if (!row || !hydrated || !draftKey) return;
    saveDraft(draftKey, { topics: [...picked] });
  }, [picked, row, hydrated, draftKey]);

  if (!row) return null;

  const topics = Array.isArray(row.covered_topics) ? row.covered_topics : [];
  const locked = row.my_request_status === 'notified';

  const toggle = (topic) => {
    if (locked) return;
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const submit = async () => {
    const list = [...picked];
    if (!list.length) {
      setError('Select at least one topic.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await submitCourseClassDoubtRequest(row.id, list);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Could not save request');
      return;
    }
    clearDraft(draftKey);
    onSaved?.();
  };

  return (
    <ModalFrame
      title="Request doubt session"
      subtitle={row.title}
      onClose={onClose}
    >
      {topics.length < 3 ? (
        <p className="text-sm text-slate-600">Topics aren’t posted for this class yet.</p>
      ) : locked ? (
        <p className="text-sm text-slate-600">
          A doubt session was already shared for your request. Check Messages or the card for the
          join link.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-600">Select one or more topics — no other fields needed.</p>
          <div className="mt-3 flex flex-col gap-2">
            {topics.map((topic) => {
              const checked = picked.has(topic);
              return (
                <label
                  key={topic}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                    checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => toggle(topic)}
                  />
                  <span className="text-slate-800">{topic}</span>
                </label>
              );
            })}
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <p className="mt-2 text-xs text-slate-500">Draft kept if you close or switch away.</p>
          <button type="button" disabled={busy} onClick={submit} className={`${btnPrimary} mt-4`}>
            {busy ? 'Saving…' : 'Submit doubt request'}
          </button>
        </>
      )}
    </ModalFrame>
  );
}

function FeedbackModal({ row, onClose, onSaved }) {
  const draftKey = row?.id ? `aspirant-feedback:${row.id}` : '';
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!row) {
      setHydrated(false);
      return;
    }
    const draft = loadDraft(draftKey, null);
    setBody(draft?.body != null ? draft.body : row.my_feedback || '');
    setError('');
    setHydrated(true);
  }, [row, draftKey]);

  useEffect(() => {
    if (!row || !hydrated || !draftKey) return;
    saveDraft(draftKey, { body });
  }, [body, row, hydrated, draftKey]);

  if (!row) return null;

  const submit = async () => {
    const text = body.trim();
    if (!text) {
      setError('Write a short feedback note.');
      return;
    }
    if (text.length > 500) {
      setError('Max 500 characters.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await submitCourseClassFeedback(row.id, text);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Could not save feedback');
      return;
    }
    clearDraft(draftKey);
    onSaved?.();
  };

  return (
    <ModalFrame title="Class feedback" subtitle={row.title} onClose={onClose}>
      <p className="text-sm text-slate-600">Short note for this class (max 500 characters).</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        rows={5}
        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm"
        placeholder="What went well? What was confusing?"
      />
      <p className="mt-1 text-xs text-slate-500">{body.length}/500 · Draft kept if you close</p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button type="button" disabled={busy} onClick={submit} className={`${btnPrimary} mt-4`}>
        {busy ? 'Saving…' : 'Save feedback'}
      </button>
    </ModalFrame>
  );
}

function EmptyCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}
