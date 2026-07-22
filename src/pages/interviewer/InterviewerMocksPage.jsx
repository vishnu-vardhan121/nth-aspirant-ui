import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import MockFeedbackModal, { createEmptyMockFeedbackForm } from '../../components/mock/MockFeedbackModal';
import MockChatModal from '../../components/mock/MockChatModal';
import EditMeetLinkModal from '../../components/interviewer/EditMeetLinkModal';
import { formatFeedbackSummary, hasAnyMockFeedback, mockFeedbackFormFromRegistration, submitMockFeedback } from '../../lib/mockFeedback';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import ViewCandidateProfileButton from '../../components/interviewer/ViewCandidateProfileButton';
import InterviewerScheduleMockModal from '../../components/interviewer/InterviewerScheduleMockModal';
import { useInterviewerMessageUnread } from '../../hooks/useInterviewerMessageUnread';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function mockSortTime(m) {
  const t = m.completed_at || m.scheduled_at || m.created_at;
  return t ? new Date(t).getTime() : 0;
}

function sortMocksLatestFirst(list, statusFilter) {
  const rows = [...list];
  if (statusFilter === 'scheduled') {
    return rows.sort((a, b) => mockSortTime(a) - mockSortTime(b));
  }
  return rows.sort((a, b) => mockSortTime(b) - mockSortTime(a));
}

function mockStatusLabel(status, reschedulePending) {
  if (reschedulePending) return 'Reschedule requested';
  const map = {
    requested: 'Assigned — pending schedule',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No show',
  };
  return map[status] ?? status ?? '—';
}

function mockStatusClass(status, reschedulePending) {
  if (reschedulePending) return 'bg-orange-100 text-orange-800';
  const map = {
    requested: 'bg-amber-100 text-amber-800',
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-600',
    no_show: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
}

function formatPreferred(date, time) {
  if (!date && !time) return null;
  const datePart = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return [datePart, time].filter(Boolean).join(' · ');
}

function AssignmentBadge({ interviewerName, assignedToMe }) {
  if (!interviewerName) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Unassigned</span>;
  }
  if (assignedToMe) {
    return <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">Assigned to you</span>;
  }
  return (
    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
      Assigned: {interviewerName}
    </span>
  );
}

const actionBtn =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap';
const actionBtnPrimary =
  'inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap';
const actionBtnDark =
  'inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 whitespace-nowrap';

function MockRowActions({ mock, unreadCount = 0, onSchedule, onChat, onEditLink, onFeedback, onRejectReschedule }) {
  const isRequested = mock.status === 'requested';
  const isScheduled = mock.status === 'scheduled';
  const isCompleted = mock.status === 'completed';
  const reschedulePending = Boolean(mock.reschedule_pending);
  const canEditFeedback = isCompleted && hasAnyMockFeedback(mock);

  const primary = isScheduled && !reschedulePending ? (
    <button type="button" onClick={() => onFeedback(mock)} className={actionBtnPrimary}>
      Add feedback
    </button>
  ) : isRequested || reschedulePending ? (
    <button
      type="button"
      onClick={() => onSchedule({ ...mock, assigned_to_me: true }, 'schedule')}
      className={actionBtnDark}
    >
      {reschedulePending ? 'Set new time' : 'Schedule'}
    </button>
  ) : canEditFeedback ? (
    <button type="button" onClick={() => onFeedback(mock, { edit: true })} className={actionBtnPrimary}>
      Edit feedback
    </button>
  ) : null;

  return (
    <div className="flex w-[17.5rem] max-w-full flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ViewCandidateProfileButton mockRegistrationId={mock.id} label="Profile" showIcon={false} />
        <button type="button" onClick={() => onChat(mock)} className={`${actionBtn} relative`}>
          <HiChatBubbleLeftRight className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
          Chat
          {unreadCount > 0 ? (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
        {mock.meet_link ? (
          <a
            href={mock.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className={`${actionBtn} text-indigo-700`}
          >
            Join
          </a>
        ) : null}
        {isScheduled && !reschedulePending ? (
          <>
            <button
              type="button"
              onClick={() => onSchedule({ ...mock, assigned_to_me: true }, 'schedule')}
              className={actionBtn}
            >
              Edit schedule
            </button>
            <button type="button" onClick={() => onEditLink(mock)} className={actionBtn}>
              {mock.meet_link ? 'Edit link' : 'Add link'}
            </button>
          </>
        ) : null}
        {reschedulePending ? (
          <button
            type="button"
            onClick={() => onRejectReschedule(mock)}
            className={`${actionBtn} text-red-700`}
          >
            Decline
          </button>
        ) : null}
      </div>
      {primary ? <div className="flex items-center">{primary}</div> : null}
    </div>
  );
}

export default function InterviewerMocksPage() {
  const [requestQueue, setRequestQueue] = useState([]);
  const [queueAvailable, setQueueAvailable] = useState(true);
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('take');
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [chatModal, setChatModal] = useState(null);
  const [editMeetLinkMock, setEditMeetLinkMock] = useState(null);
  const [rejectRescheduleMock, setRejectRescheduleMock] = useState(null);
  const [rejectRescheduleMessage, setRejectRescheduleMessage] = useState('');
  const [rejectRescheduleSaving, setRejectRescheduleSaving] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(() => createEmptyMockFeedbackForm());
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState({ type: '', text: '' });
  const { unreadByMockId, refresh: refreshUnread } = useInterviewerMessageUnread();

  const mocksWithUnread = useMemo(
    () => mocks.filter((m) => (unreadByMockId[m.id] ?? 0) > 0).length,
    [mocks, unreadByMockId],
  );

  const pendingRescheduleCount = useMemo(
    () => mocks.filter((m) => m.reschedule_pending).length,
    [mocks],
  );

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: '', text: '' }), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [queueRes, mocksRes] = await Promise.all([
      supabase.rpc('get_interviewer_mock_request_queue'),
      supabase.rpc('get_interviewer_mocks', { p_status: statusFilter || null }),
    ]);

    if (queueRes.error) {
      setRequestQueue([]);
      setQueueAvailable(false);
    } else {
      setRequestQueue(Array.isArray(queueRes.data) ? queueRes.data : []);
      setQueueAvailable(true);
    }

    setMocks(sortMocksLatestFirst(Array.isArray(mocksRes.data) ? mocksRes.data : [], statusFilter));
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openFeedback = (m, { edit = false } = {}) => {
    setFeedbackModal(m);
    setFeedbackForm(edit ? mockFeedbackFormFromRegistration(m) : createEmptyMockFeedbackForm());
  };

  const submitFeedback = async (form) => {
    if (!feedbackModal) return;
    const isEdit = feedbackModal.status === 'completed';
    setSubmitting(true);
    const result = await submitMockFeedback(supabase, feedbackModal.id, form);
    setSubmitting(false);
    if (result?.ok) {
      setFeedbackModal(null);
      showFlash(
        'success',
        isEdit || result.edited
          ? 'Feedback updated. The aspirant has been notified.'
          : 'Feedback submitted. Mock marked as completed.',
      );
      loadData();
    } else {
      showFlash('error', result?.error ?? 'Failed to submit.');
    }
  };

  const openSchedule = (mock, mode) => {
    setScheduleMode(mode);
    setScheduleModal(mock);
  };

  const handleRejectReschedule = async (e) => {
    e.preventDefault();
    if (!rejectRescheduleMock?.reschedule_request_id) return;
    setRejectRescheduleSaving(true);
    const { data } = await supabase.rpc('reject_mock_reschedule', {
      p_request_id: rejectRescheduleMock.reschedule_request_id,
      p_message_to_aspirant:
        rejectRescheduleMessage.trim() ||
        'Your reschedule request could not be accommodated. Please book a new slot or request a mock again.',
    });
    setRejectRescheduleSaving(false);
    if (data?.ok) {
      setRejectRescheduleMock(null);
      setRejectRescheduleMessage('');
      showFlash('success', 'Reschedule declined. Aspirant must book/request again.');
      loadData();
    } else {
      showFlash('error', data?.error ?? 'Failed to decline.');
    }
  };

  const myMocks = mocks;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Mocks</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick an open request, assign it to yourself, set the time and Meet link, then conduct the mock and submit feedback.
          Admin can still assign if needed — you handle most of it here.
        </p>
      </div>

      {flash.text ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            flash.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      {/* Open request queue — all interviewers */}
      <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3">
          <h2 className="text-base font-semibold text-amber-950">Open mock requests</h2>
          <p className="text-xs text-amber-800 mt-0.5">
            Students who requested a mock without booking a slot. Take one, schedule it, and complete it — no admin step required.
          </p>
        </div>
        {loading ? (
          <PageLoader size="sm" label="Loading requests…" className="py-6" />
        ) : !queueAvailable ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Request queue requires migration 107+. Ask admin to run <code className="text-xs">supabase db push</code>.
          </p>
        ) : requestQueue.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 text-center">No open mock requests right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-600">Aspirant</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-600">Requested</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-600">Notes</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-600">Assignment</th>
                  <th className="min-w-[220px] px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestQueue.map((r) => (
                  <tr key={r.id} className={r.assigned_to_me ? 'bg-indigo-50/40' : ''}>
                    <td className="px-4 py-3 align-top">
                      <span className="font-medium text-slate-900">{r.aspirant_name ?? '—'}</span>
                      {r.aspirant_phone ? (
                        <span className="block text-xs font-medium tabular-nums text-slate-600">{r.aspirant_phone}</span>
                      ) : null}
                      {r.aspirant_email ? <span className="block text-xs text-slate-500">{r.aspirant_email}</span> : null}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 align-top max-w-[200px] text-xs text-slate-700">
                      {r.availability_notes ? (
                        <span className="line-clamp-3" title={r.availability_notes}>{r.availability_notes}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <AssignmentBadge interviewerName={r.interviewer_name} assignedToMe={r.assigned_to_me} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        {!r.interviewer_id ? (
                          <button type="button" onClick={() => openSchedule(r, 'take')} className={actionBtnPrimary}>
                            Take &amp; schedule
                          </button>
                        ) : r.assigned_to_me ? (
                          <button type="button" onClick={() => openSchedule(r, 'schedule')} className={actionBtnDark}>
                            Schedule
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Taken by {r.interviewer_name}</span>
                        )}
                        {(r.assigned_to_me || !r.interviewer_id) && (
                          <ViewCandidateProfileButton mockRegistrationId={r.id} label="Profile" showIcon={false} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* My assigned mocks */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">My assigned mocks</h2>
            <p className="text-xs text-slate-500">Your taken requests, slot bookings, and scheduled mocks.</p>
            {pendingRescheduleCount > 0 ? (
              <p className="mt-1 text-xs font-semibold text-orange-700">
                {pendingRescheduleCount} reschedule request{pendingRescheduleCount === 1 ? '' : 's'} — old slot is free; set a new time (do not wait at the previous meeting).
              </p>
            ) : null}
            {mocksWithUnread > 0 ? (
              <p className="mt-1 text-xs font-medium text-indigo-700">
                {mocksWithUnread} mock{mocksWithUnread === 1 ? '' : 's'} with unread chat — open Chat on that row
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="requested">Pending schedule</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <PageLoader size="md" label="Loading mocks…" className="py-8" />
        ) : myMocks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No mocks assigned to you yet. Take an open request above or wait for a student to book your slot.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Aspirant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Scheduled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Feedback</th>
                  <th className="w-[17.5rem] px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {myMocks.map((m) => {
                  const unreadCount = unreadByMockId[m.id] ?? 0;
                  const preferred = formatPreferred(m.preferred_date, m.preferred_time);
                  return (
                  <tr
                    key={m.id}
                    className={
                      m.reschedule_pending
                        ? 'bg-orange-50/70'
                        : unreadCount > 0
                          ? 'bg-amber-50/50'
                          : 'bg-white'
                    }
                  >
                    <td className="px-4 py-3 align-top text-sm">
                      <span className="font-medium text-slate-900">{m.aspirant_name}</span>
                      {m.aspirant_phone ? (
                        <span className="block text-xs font-medium tabular-nums text-slate-600">{m.aspirant_phone}</span>
                      ) : null}
                      {m.aspirant_email ? <span className="block text-xs text-slate-500">{m.aspirant_email}</span> : null}
                      {m.reschedule_pending ? (
                        <div className="mt-1.5 space-y-0.5 text-xs text-orange-900">
                          {m.previous_scheduled_at ? (
                            <p>Was: {formatDateTime(m.previous_scheduled_at)} (slot freed)</p>
                          ) : null}
                          {preferred ? <p className="font-medium">Preferred: {preferred}</p> : null}
                          {m.reschedule_reason ? (
                            <p className="line-clamp-2 text-orange-800/90" title={m.reschedule_reason}>
                              Reason: {m.reschedule_reason}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-slate-700 whitespace-nowrap">
                      {m.scheduled_at
                        ? formatDateTime(m.scheduled_at)
                        : m.reschedule_pending
                          ? 'Needs new time'
                          : m.status === 'requested'
                            ? 'Set schedule'
                            : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${mockStatusClass(m.status, m.reschedule_pending)}`}>
                        {mockStatusLabel(m.status, m.reschedule_pending)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-slate-600 max-w-xs">
                      {m.status === 'completed' ? formatFeedbackSummary(m) : '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      <MockRowActions
                        mock={m}
                        unreadCount={unreadCount}
                        onSchedule={openSchedule}
                        onChat={setChatModal}
                        onEditLink={setEditMeetLinkMock}
                        onFeedback={openFeedback}
                        onRejectReschedule={(mock) => {
                          setRejectRescheduleMock(mock);
                          setRejectRescheduleMessage('');
                        }}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InterviewerScheduleMockModal
        open={!!scheduleModal}
        mock={scheduleModal}
        mode={scheduleMode}
        onClose={() => setScheduleModal(null)}
        onSuccess={() => {
          const wasRescheduleRequest = Boolean(scheduleModal?.reschedule_pending);
          const hadSchedule = Boolean(scheduleModal?.scheduled_at);
          const msg =
            scheduleMode === 'take'
              ? 'Mock taken and scheduled. Aspirant notified.'
              : wasRescheduleRequest || hadSchedule
                ? 'New time set. Aspirant notified.'
                : 'Schedule saved. Aspirant notified.';
          showFlash('success', msg);
          loadData();
        }}
      />

      {rejectRescheduleMock ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={() => !rejectRescheduleSaving && setRejectRescheduleMock(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Decline reschedule request</h3>
            <p className="mt-1 text-sm text-slate-600">
              {rejectRescheduleMock.aspirant_name} will not keep the old slot — they must book or request a mock again.
            </p>
            <form onSubmit={handleRejectReschedule} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Message to aspirant</label>
                <textarea
                  value={rejectRescheduleMessage}
                  onChange={(e) => setRejectRescheduleMessage(e.target.value)}
                  rows={3}
                  placeholder="Optional note…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={rejectRescheduleSaving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectRescheduleSaving ? 'Declining…' : 'Decline & cancel mock'}
                </button>
                <button
                  type="button"
                  disabled={rejectRescheduleSaving}
                  onClick={() => setRejectRescheduleMock(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <MockFeedbackModal
        open={!!feedbackModal}
        registration={feedbackModal}
        value={feedbackForm}
        onChange={setFeedbackForm}
        onSubmit={submitFeedback}
        submitting={submitting}
        onClose={() => setFeedbackModal(null)}
        title={feedbackModal?.status === 'completed' ? 'Edit feedback' : 'Add feedback'}
        submitLabel={feedbackModal?.status === 'completed' ? 'Save changes' : 'Submit'}
        editing={feedbackModal?.status === 'completed'}
      />

      <MockChatModal
        open={!!chatModal}
        registration={chatModal}
        onClose={() => setChatModal(null)}
        onMarkedRead={refreshUnread}
      />

      <EditMeetLinkModal
        open={!!editMeetLinkMock}
        mockRegistrationId={editMeetLinkMock?.id}
        initialLink={editMeetLinkMock?.meet_link || ''}
        onClose={() => setEditMeetLinkMock(null)}
        onSaved={() => {
          showFlash('success', 'Meet link updated. The aspirant has been notified.');
          loadData();
        }}
      />
    </div>
  );
}
