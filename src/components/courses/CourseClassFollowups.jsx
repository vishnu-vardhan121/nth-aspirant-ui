import { useEffect, useState } from 'react';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import {
  formatClassDateTimeIst,
  listMyCourseClassFollowups,
  submitCourseClassDoubtRequest,
  submitCourseClassFeedback,
} from '../../lib/courses';
import JoinLiveClassModal from './JoinLiveClassModal';
import { useAppSelector } from '../../store/hooks';

/**
 * Aspirant: multi-select topics for doubt request + optional 500-char class feedback.
 */
export default function CourseClassFollowups({ courseId }) {
  const user = useAppSelector((state) => state.auth.user);
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const registeredEmail =
    String(aspirantProfile?.email || user?.email || '')
      .trim()
      .toLowerCase() || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [feedback, setFeedback] = useState({});
  const [busyId, setBusyId] = useState('');
  const [msgById, setMsgById] = useState({});
  const [joinPrompt, setJoinPrompt] = useState(null);

  const reload = async () => {
    setLoading(true);
    const res = await listMyCourseClassFollowups(courseId);
    setLoading(false);
    if (!res.ok) {
      setRows([]);
      return;
    }
    const list = res.classes || [];
    setRows(list);
    const sel = {};
    const fb = {};
    for (const row of list) {
      const topics = Array.isArray(row.my_request_topics) ? row.my_request_topics : [];
      sel[row.id] = new Set(topics);
      fb[row.id] = row.my_feedback || '';
    }
    setSelected(sel);
    setFeedback(fb);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await listMyCourseClassFollowups(courseId);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const list = res.classes || [];
      setRows(list);
      const sel = {};
      const fb = {};
      for (const row of list) {
        sel[row.id] = new Set(Array.isArray(row.my_request_topics) ? row.my_request_topics : []);
        fb[row.id] = row.my_feedback || '';
      }
      setSelected(sel);
      setFeedback(fb);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const toggleTopic = (classId, topic) => {
    setSelected((m) => {
      const next = new Set(m[classId] || []);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return { ...m, [classId]: next };
    });
  };

  const saveRequest = async (classId) => {
    const topics = [...(selected[classId] || [])];
    setMsgById((m) => ({ ...m, [classId]: { type: '', text: '' } }));
    if (!topics.length) {
      setMsgById((m) => ({
        ...m,
        [classId]: { type: 'error', text: 'Select at least one topic.' },
      }));
      return;
    }
    setBusyId(`req-${classId}`);
    const res = await submitCourseClassDoubtRequest(classId, topics);
    setBusyId('');
    if (!res.ok) {
      setMsgById((m) => ({
        ...m,
        [classId]: { type: 'error', text: res.error || 'Could not save request' },
      }));
      return;
    }
    setMsgById((m) => ({
      ...m,
      [classId]: { type: 'success', text: 'Doubt request saved. We’ll message you when a session is scheduled.' },
    }));
    reload();
  };

  const saveFeedback = async (classId) => {
    const body = String(feedback[classId] || '').trim();
    setMsgById((m) => ({ ...m, [`fb-${classId}`]: { type: '', text: '' } }));
    if (!body) {
      setMsgById((m) => ({
        ...m,
        [`fb-${classId}`]: { type: 'error', text: 'Write a short feedback note.' },
      }));
      return;
    }
    if (body.length > 500) {
      setMsgById((m) => ({
        ...m,
        [`fb-${classId}`]: { type: 'error', text: 'Max 500 characters.' },
      }));
      return;
    }
    setBusyId(`fb-${classId}`);
    const res = await submitCourseClassFeedback(classId, body);
    setBusyId('');
    if (!res.ok) {
      setMsgById((m) => ({
        ...m,
        [`fb-${classId}`]: { type: 'error', text: res.error || 'Could not save feedback' },
      }));
      return;
    }
    setMsgById((m) => ({
      ...m,
      [`fb-${classId}`]: { type: 'success', text: 'Thanks — feedback saved.' },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Heading />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="space-y-2">
        <Heading />
        <p className="text-[13px] leading-relaxed text-slate-600 sm:text-sm">
          After a class, topics will appear here so you can request a doubt session and leave short
          feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Heading />
      <ul className="space-y-3">
        {rows.map((row) => {
          const topics = Array.isArray(row.covered_topics) ? row.covered_topics : [];
          const sel = selected[row.id] || new Set();
          const locked = row.my_request_status === 'notified';
          const sessions = Array.isArray(row.my_doubt_sessions) ? row.my_doubt_sessions : [];
          const reqMsg = msgById[row.id];
          const fbMsg = msgById[`fb-${row.id}`];
          const fbLen = String(feedback[row.id] || '').length;

          return (
            <li
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-sm font-semibold text-slate-900">{row.title}</p>
              <p className="mt-1 text-[13px] text-slate-600">{formatClassDateTimeIst(row.starts_at)}</p>

              {sessions.length ? (
                <div className="mt-3 space-y-2 rounded-xl bg-indigo-50/80 px-3 py-2.5">
                  <p className="text-xs font-semibold text-indigo-900">Your doubt session</p>
                  {sessions.map((ds) => (
                    <div key={ds.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ds.title}</p>
                        <p className="text-xs text-slate-600">{formatClassDateTimeIst(ds.starts_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setJoinPrompt({ meetUrl: ds.meet_url })}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                      >
                        Join doubt session
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Request doubt — select topics
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {topics.map((topic) => {
                    const checked = sel.has(topic);
                    return (
                      <label
                        key={topic}
                        className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                          checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
                        } ${locked ? 'opacity-70' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggleTopic(row.id, topic)}
                        />
                        <span className="text-slate-800">{topic}</span>
                      </label>
                    );
                  })}
                </div>
                {reqMsg?.text ? (
                  <p
                    className={`mt-2 text-sm ${reqMsg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
                  >
                    {reqMsg.text}
                  </p>
                ) : null}
                {!locked ? (
                  <button
                    type="button"
                    disabled={busyId === `req-${row.id}`}
                    onClick={() => saveRequest(row.id)}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
                  >
                    {busyId === `req-${row.id}` ? 'Saving…' : 'Submit doubt request'}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Request linked to a scheduled doubt session.</p>
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Class feedback (optional, max 500)
                </p>
                <textarea
                  value={feedback[row.id] || ''}
                  onChange={(e) =>
                    setFeedback((m) => ({
                      ...m,
                      [row.id]: e.target.value.slice(0, 500),
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm"
                  placeholder="Short note about this class…"
                />
                <p className="mt-1 text-xs text-slate-500">{fbLen}/500</p>
                {fbMsg?.text ? (
                  <p
                    className={`mt-1 text-sm ${fbMsg.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
                  >
                    {fbMsg.text}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === `fb-${row.id}`}
                  onClick={() => saveFeedback(row.id)}
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {busyId === `fb-${row.id}` ? 'Saving…' : 'Save feedback'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <JoinLiveClassModal
        open={Boolean(joinPrompt)}
        email={registeredEmail}
        meetUrl={joinPrompt?.meetUrl || ''}
        linkLabel="I’ve joined with this email — Open session"
        onClose={() => setJoinPrompt(null)}
      />
    </div>
  );
}

function Heading() {
  return (
    <div className="flex items-center gap-2">
      <HiChatBubbleLeftRight className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
      <h3 className="text-base font-bold text-slate-900">Topics &amp; doubt request</h3>
    </div>
  );
}
