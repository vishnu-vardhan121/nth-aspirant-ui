import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';
import MockFeedbackModal, { createEmptyMockFeedbackForm } from '../../components/mock/MockFeedbackModal';
import MockChatModal from '../../components/mock/MockChatModal';
import EditMeetLinkModal from '../../components/interviewer/EditMeetLinkModal';
import { formatFeedbackSummary, submitMockFeedback } from '../../lib/mockFeedback';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import ViewCandidateProfileButton from '../../components/interviewer/ViewCandidateProfileButton';
import InterviewerScheduleMockModal from '../../components/interviewer/InterviewerScheduleMockModal';

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

function mockStatusLabel(status) {
  const map = {
    requested: 'Assigned — pending schedule',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No show',
  };
  return map[status] ?? status ?? '—';
}

function mockStatusClass(status) {
  const map = {
    requested: 'bg-amber-100 text-amber-800',
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-600',
    no_show: 'bg-red-100 text-red-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
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
  const [feedbackForm, setFeedbackForm] = useState(() => createEmptyMockFeedbackForm());
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState({ type: '', text: '' });

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

  const openFeedback = (m) => {
    setFeedbackModal(m);
    setFeedbackForm(createEmptyMockFeedbackForm());
  };

  const submitFeedback = async (form) => {
    if (!feedbackModal) return;
    setSubmitting(true);
    const result = await submitMockFeedback(supabase, feedbackModal.id, form);
    setSubmitting(false);
    if (result?.ok) {
      setFeedbackModal(null);
      showFlash('success', 'Feedback submitted. Mock marked as completed.');
      loadData();
    } else {
      showFlash('error', result?.error ?? 'Failed to submit.');
    }
  };

  const openSchedule = (mock, mode) => {
    setScheduleMode(mode);
    setScheduleModal(mock);
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
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestQueue.map((r) => (
                  <tr key={r.id} className={r.assigned_to_me ? 'bg-indigo-50/40' : ''}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{r.aspirant_name ?? '—'}</span>
                      {r.aspirant_phone ? (
                        <span className="block text-xs font-medium tabular-nums text-slate-600">{r.aspirant_phone}</span>
                      ) : null}
                      {r.aspirant_email ? <span className="block text-xs text-slate-500">{r.aspirant_email}</span> : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 max-w-[200px] text-xs text-slate-700">
                      {r.availability_notes ? (
                        <span className="line-clamp-3" title={r.availability_notes}>{r.availability_notes}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AssignmentBadge interviewerName={r.interviewer_name} assignedToMe={r.assigned_to_me} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {!r.interviewer_id ? (
                          <button
                            type="button"
                            onClick={() => openSchedule(r, 'take')}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Take &amp; schedule
                          </button>
                        ) : r.assigned_to_me ? (
                          <button
                            type="button"
                            onClick={() => openSchedule(r, 'schedule')}
                            className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            Schedule
                          </button>
                        ) : null}
                        {r.assigned_to_me || !r.interviewer_id ? (
                          <ViewCandidateProfileButton mockRegistrationId={r.id} label="Profile" />
                        ) : (
                          <span className="text-xs text-slate-400">Taken by {r.interviewer_name}</span>
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Aspirant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Scheduled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {myMocks.map((m) => (
                  <tr key={m.id} className="bg-white">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-slate-900">{m.aspirant_name}</span>
                      {m.aspirant_phone ? (
                        <span className="block text-xs font-medium tabular-nums text-slate-600">{m.aspirant_phone}</span>
                      ) : null}
                      {m.aspirant_email ? <span className="block text-xs text-slate-500">{m.aspirant_email}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {m.scheduled_at ? formatDateTime(m.scheduled_at) : m.status === 'requested' ? 'Set schedule' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${mockStatusClass(m.status)}`}>
                        {mockStatusLabel(m.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                      {m.status === 'completed' ? formatFeedbackSummary(m) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <ViewCandidateProfileButton mockRegistrationId={m.id} label="Profile" className="mr-2" />
                      {m.status === 'requested' ? (
                        <button
                          type="button"
                          onClick={() => openSchedule({ ...m, assigned_to_me: true }, 'schedule')}
                          className="mr-2 rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                        >
                          Schedule
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setChatModal(m)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <HiChatBubbleLeftRight className="h-3.5 w-3.5 text-indigo-600" />
                        Chat
                      </button>
                      {m.meet_link ? (
                        <a href={m.meet_link} target="_blank" rel="noopener noreferrer" className="mr-2 text-indigo-600 hover:underline">
                          Join
                        </a>
                      ) : null}
                      {m.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => setEditMeetLinkMock(m)}
                          className="mr-2 text-xs font-medium text-indigo-600 hover:underline"
                        >
                          {m.meet_link ? 'Edit link' : 'Add link'}
                        </button>
                      )}
                      {m.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => openFeedback(m)}
                          className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                          Complete &amp; submit feedback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
          showFlash('success', scheduleMode === 'take' ? 'Mock taken and scheduled. Aspirant notified.' : 'Schedule saved. Aspirant notified.');
          loadData();
        }}
      />

      <MockFeedbackModal
        open={!!feedbackModal}
        registration={feedbackModal}
        value={feedbackForm}
        onChange={setFeedbackForm}
        onSubmit={submitFeedback}
        submitting={submitting}
        onClose={() => setFeedbackModal(null)}
        title="Submit mock feedback"
        submitLabel="Submit & mark completed"
      />

      <MockChatModal open={!!chatModal} registration={chatModal} onClose={() => setChatModal(null)} />

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
