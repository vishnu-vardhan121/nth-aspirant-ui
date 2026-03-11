import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader, Loader } from '../../components/ui/Loader';
import { HiCalendarDays, HiLink, HiCheckCircle } from 'react-icons/hi2';

function formatDate(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(createdAt) {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminMocksPage() {
  const [registrations, setRegistrations] = useState([]);
  const [byAspirant, setByAspirant] = useState({});
  const [completedReport, setCompletedReport] = useState([]);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportSortBy, setReportSortBy] = useState('');
  const [reportOrder, setReportOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: '', meetLink: '', adminNotes: '', notify: true });
  const [flash, setFlash] = useState({ type: '', text: '' });
  const [interviewers, setInterviewers] = useState([]);
  const [createSlotsForm, setCreateSlotsForm] = useState({ interviewerId: '', date: '', startTime: '14:00', endTime: '16:00', duration: 25, meetLink: '' });
  const [createSlotsSaving, setCreateSlotsSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsFrom, setSlotsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [slotsTo, setSlotsTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [slotsInterviewerId, setSlotsInterviewerId] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduleSlotAdmin, setRescheduleSlotAdmin] = useState(null);
  const [rescheduleFormAdmin, setRescheduleFormAdmin] = useState({ start: '', end: '' });
  const [rescheduleSavingAdmin, setRescheduleSavingAdmin] = useState(false);
  const [cancelSlotAdmin, setCancelSlotAdmin] = useState(null);
  const [cancelReasonAdmin, setCancelReasonAdmin] = useState('');
  const [cancelSavingAdmin, setCancelSavingAdmin] = useState(false);

  const setFlashMsg = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: '', text: '' }), 4000);
  };

  const fetchMocks = async () => {
    const { data, error } = await supabase.rpc('get_admin_mock_registrations');
    if (!error && data) {
      setRegistrations(data.registrations ?? []);
      setByAspirant(data.by_aspirant ?? {});
    }
    setLoading(false);
  };

  const fetchCompletedReport = async () => {
    const from = reportFrom || undefined;
    const to = reportTo || undefined;
    const { data } = await supabase.rpc('get_admin_mocks_completed_report', {
      p_from_date: from,
      p_to_date: to,
      p_sort_by: reportSortBy || null,
      p_order: reportOrder || 'desc',
    });
    setCompletedReport(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchMocks();
  }, []);

  useEffect(() => {
    fetchCompletedReport();
  }, [reportFrom, reportTo, reportSortBy, reportOrder]);

  useEffect(() => {
    supabase.rpc('get_interviewers_list').then(({ data }) => setInterviewers(Array.isArray(data) ? data : []));
  }, []);

  const fetchSlots = async () => {
    setSlotsLoading(true);
    const { data } = await supabase.rpc('get_admin_mock_slots', {
      p_from_date: slotsFrom || null,
      p_to_date: slotsTo || null,
      p_interviewer_id: slotsInterviewerId || null,
    });
    setSlots(Array.isArray(data) ? data : []);
    setSlotsLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, [slotsFrom, slotsTo, slotsInterviewerId]);

  const handleCreateSlots = async (e) => {
    e.preventDefault();
    if (!createSlotsForm.interviewerId || !createSlotsForm.date || !createSlotsForm.startTime || !createSlotsForm.endTime) {
      setFlashMsg('error', 'Select interviewer, date, start and end time.');
      return;
    }
    const startAt = new Date(`${createSlotsForm.date}T${createSlotsForm.startTime}:00`);
    const endAt = new Date(`${createSlotsForm.date}T${createSlotsForm.endTime}:00`);
    if (endAt <= startAt) {
      setFlashMsg('error', 'End time must be after start time.');
      return;
    }
    setCreateSlotsSaving(true);
    const { data } = await supabase.rpc('create_mock_slots', {
      p_interviewer_id: createSlotsForm.interviewerId,
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_slot_duration_mins: createSlotsForm.duration,
      p_meet_link: createSlotsForm.meetLink?.trim() || null,
    });
    setCreateSlotsSaving(false);
    if (data?.ok) {
      setFlashMsg('success', 'Slots created. Aspirants can book them from the Mocks page.');
      setCreateSlotsForm((f) => ({ ...f, interviewerId: '', date: '', meetLink: '' }));
      fetchSlots();
      fetchMocks();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to create slots.');
    }
  };

  const handleMarkCompleted = async (r, notify = true) => {
    setCompletingId(r.id);
    const { data } = await supabase.rpc('mark_mock_completed', { p_registration_id: r.id });
    setCompletingId(null);
    if (data?.ok) {
      if (notify && r.aspirant_id) {
        await supabase.rpc('send_message', {
          p_to_aspirant_id: r.aspirant_id,
          p_subject: null,
          p_body: `Your mock interview has been marked as completed. Thank you for participating!`,
          p_job_id: null,
          p_mock_registration_id: r.id,
        });
      }
      fetchMocks();
      fetchSlots();
      fetchCompletedReport();
      setFlashMsg('success', 'Mock marked as completed.');
    } else {
      setFlashMsg('error', data?.error ?? 'Failed.');
    }
  };

  const handleMarkNoShow = async (r, notify = true) => {
    const { data } = await supabase.rpc('mark_mock_no_show', { p_registration_id: r.id });
    if (data?.ok) {
      if (notify && r.aspirant_id) {
        await supabase.rpc('send_message', {
          p_to_aspirant_id: r.aspirant_id,
          p_subject: null,
          p_body: `Your scheduled mock was marked as no-show. You can request a new mock from your dashboard (your slot has been freed).`,
          p_job_id: null,
          p_mock_registration_id: r.id,
        });
      }
      fetchMocks();
      fetchSlots();
      fetchCompletedReport();
      setFlashMsg('success', 'Marked no-show. Slot freed.');
    } else {
      setFlashMsg('error', data?.error ?? 'Failed.');
    }
  };

  const handleCancelSlot = async (r) => {
    const { data } = await supabase.rpc('mark_mock_cancelled', { p_registration_id: r.id });
    if (data?.ok) {
      fetchMocks();
      fetchSlots();
      fetchCompletedReport();
      setFlashMsg('success', 'Slot cancelled.');
    } else {
      setFlashMsg('error', data?.error ?? 'Failed.');
    }
  };

  const openScheduleModal = (r) => {
    setScheduleModal(r);
    const d = r.scheduled_at ? new Date(r.scheduled_at) : new Date();
    const local = d.toISOString().slice(0, 16);
    setScheduleForm({
      scheduledAt: local,
      meetLink: r.meet_link ?? '',
      adminNotes: r.admin_notes ?? '',
      notify: true,
    });
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleModal) return;
    setScheduleSaving(true);
    const scheduledAt = scheduleForm.scheduledAt ? new Date(scheduleForm.scheduledAt).toISOString() : null;
    const { data } = await supabase.rpc('admin_schedule_mock', {
      p_registration_id: scheduleModal.id,
      p_scheduled_at: scheduledAt,
      p_meet_link: scheduleForm.meetLink.trim() || null,
      p_admin_notes: scheduleForm.adminNotes.trim() || null,
    });
    setScheduleSaving(false);
    if (data?.ok) {
      if (scheduleForm.notify && scheduleModal.aspirant_id) {
        const msg = scheduleForm.meetLink
          ? `Your mock interview is scheduled for ${formatDateTime(scheduledAt)}. Join here: ${scheduleForm.meetLink.trim()}`
          : `Your mock interview is scheduled for ${formatDateTime(scheduledAt)}.`;
        await supabase.rpc('send_message', {
          p_to_aspirant_id: scheduleModal.aspirant_id,
          p_subject: null,
          p_body: msg,
          p_job_id: null,
          p_mock_registration_id: scheduleModal.id,
        });
      }
      setScheduleModal(null);
      fetchMocks();
      fetchSlots();
      setFlashMsg('success', 'Schedule saved.');
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to save schedule.');
    }
  };

  const openRescheduleSlotAdmin = (slot) => {
    setRescheduleSlotAdmin(slot);
    setRescheduleFormAdmin({
      start: new Date(slot.start_at).toISOString().slice(0, 16),
      end: new Date(slot.end_at).toISOString().slice(0, 16),
    });
  };

  const handleRescheduleSlotAdminSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSlotAdmin) return;
    const startAt = new Date(rescheduleFormAdmin.start);
    const endAt = new Date(rescheduleFormAdmin.end);
    if (endAt <= startAt) {
      setFlashMsg('error', 'End time must be after start time.');
      return;
    }
    setRescheduleSavingAdmin(true);
    const { data } = await supabase.rpc('reschedule_mock_slot', {
      p_slot_id: rescheduleSlotAdmin.id,
      p_new_start_at: startAt.toISOString(),
      p_new_end_at: endAt.toISOString(),
    });
    setRescheduleSavingAdmin(false);
    if (data?.ok) {
      setRescheduleSlotAdmin(null);
      setFlashMsg('success', 'Slot rescheduled. Aspirant will be notified if booked.');
      fetchSlots();
      fetchMocks();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to reschedule.');
    }
  };

  const handleCancelSlotAdminSubmit = async (e) => {
    e.preventDefault();
    if (!cancelSlotAdmin) return;
    setCancelSavingAdmin(true);
    const { data } = await supabase.rpc('cancel_mock_slot', {
      p_slot_id: cancelSlotAdmin.id,
      p_reason: cancelReasonAdmin.trim() || null,
    });
    setCancelSavingAdmin(false);
    if (data?.ok) {
      setCancelSlotAdmin(null);
      setCancelReasonAdmin('');
      setFlashMsg('success', 'Slot cancelled. Aspirant will be notified if it was booked.');
      fetchSlots();
      fetchMocks();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to cancel.');
    }
  };

  if (loading) {
    return <PageLoader size="md" label="Loading mock registrations…" className="py-12" />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Mock interviews</h1>
      <p className="text-slate-600 mb-2">
        New requests start as <strong>Requested</strong>. Set schedule (date, Meet link) to move to Scheduled. If the user doesn’t join, mark <strong>No-show</strong> to free the slot so they can request again.
      </p>
      <p className="text-slate-500 text-sm mb-6">
        Mock-related messages go to aspirant’s Messages and Mocks page. They need to open the dashboard to see the Meet link unless you share it separately.
      </p>

      {flash.text && (
        <div className={`rounded-lg px-4 py-2 text-sm ${flash.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {flash.text}
        </div>
      )}

      {/* Create slots (interviewer availability) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Create mock slots</h2>
        <p className="text-sm text-slate-600 mb-4">
          Pick an interviewer and a time window. Slots (e.g. 25 min each) will be created for aspirants to book.
        </p>
        <form onSubmit={handleCreateSlots} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Interviewer</label>
            <select
              value={createSlotsForm.interviewerId}
              onChange={(e) => setCreateSlotsForm((f) => ({ ...f, interviewerId: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[180px]"
              required
            >
              <option value="">Select</option>
              {interviewers.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={createSlotsForm.date}
              onChange={(e) => setCreateSlotsForm((f) => ({ ...f, date: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start time</label>
            <input
              type="time"
              value={createSlotsForm.startTime}
              onChange={(e) => setCreateSlotsForm((f) => ({ ...f, startTime: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End time</label>
            <input
              type="time"
              value={createSlotsForm.endTime}
              onChange={(e) => setCreateSlotsForm((f) => ({ ...f, endTime: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slot duration (min)</label>
            <select
              value={createSlotsForm.duration}
              onChange={(e) => setCreateSlotsForm((f) => ({ ...f, duration: Number(e.target.value) }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={25}>25</option>
              <option value={30}>30</option>
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Meet link (optional)</label>
            <input
              type="url"
              value={createSlotsForm.meetLink}
              onChange={(e) => setCreateSlotsForm((f) => ({ ...f, meetLink: e.target.value }))}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createSlotsSaving || interviewers.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createSlotsSaving ? 'Creating…' : 'Create slots'}
          </button>
        </form>
        {interviewers.length === 0 && (
          <p className="mt-2 text-sm text-amber-700">Mark at least one admin as Interviewer on the Admins page to create slots.</p>
        )}
      </div>

      {/* Scheduled slots: view, reschedule, cancel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Scheduled slots (view / edit / cancel)</h2>
        <p className="text-sm text-slate-600 mb-4">
          All slots you created. Filter by date range and interviewer. Reschedule or cancel a slot; the aspirant will be notified if the slot was booked.
        </p>
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From date</label>
            <input
              type="date"
              value={slotsFrom}
              onChange={(e) => setSlotsFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To date</label>
            <input
              type="date"
              value={slotsTo}
              onChange={(e) => setSlotsTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Interviewer</label>
            <select
              value={slotsInterviewerId}
              onChange={(e) => setSlotsInterviewerId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">All</option>
              {interviewers.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={fetchSlots} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Refresh
          </button>
        </div>
        {slotsLoading ? (
          <p className="text-sm text-slate-500 py-4">Loading slots…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No slots in this range. Create slots above to see them here.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Date & time</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Interviewer</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Aspirant</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Meet</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-900 whitespace-nowrap">{formatDateTime(s.start_at)} – {formatDateTime(s.end_at)}</td>
                    <td className="px-3 py-2 text-slate-700">{s.interviewer_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'booked' ? 'bg-green-100 text-green-800' : s.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {s.aspirant_name ? <>{s.aspirant_name}{s.aspirant_email && <span className="block text-xs text-slate-500">{s.aspirant_email}</span>}</> : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {s.meet_link ? <a href={s.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Join</a> : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {s.status !== 'cancelled' && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openRescheduleSlotAdmin(s)} className="text-sm font-medium text-indigo-600 hover:underline">Reschedule</button>
                          <button type="button" onClick={() => { setCancelSlotAdmin(s); setCancelReasonAdmin(''); }} className="text-sm font-medium text-red-600 hover:underline">Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule slot modal (admin) */}
      {rescheduleSlotAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reschedule slot</h3>
            <p className="text-sm text-slate-600 mb-4">
              {formatDateTime(rescheduleSlotAdmin.start_at)} – {rescheduleSlotAdmin.interviewer_name}
              {rescheduleSlotAdmin.aspirant_name && <span className="block mt-1">Booked by: {rescheduleSlotAdmin.aspirant_name}</span>}
            </p>
            <form onSubmit={handleRescheduleSlotAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New start</label>
                <input type="datetime-local" value={rescheduleFormAdmin.start} onChange={(e) => setRescheduleFormAdmin((f) => ({ ...f, start: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New end</label>
                <input type="datetime-local" value={rescheduleFormAdmin.end} onChange={(e) => setRescheduleFormAdmin((f) => ({ ...f, end: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={rescheduleSavingAdmin} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{rescheduleSavingAdmin ? 'Saving…' : 'Reschedule'}</button>
                <button type="button" onClick={() => setRescheduleSlotAdmin(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel slot modal (admin) */}
      {cancelSlotAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Cancel slot</h3>
            <p className="text-sm text-slate-600 mb-4">
              {formatDateTime(cancelSlotAdmin.start_at)} – {cancelSlotAdmin.interviewer_name}
              {cancelSlotAdmin.aspirant_name && <span className="block mt-1">Booked by: {cancelSlotAdmin.aspirant_name}</span>}
            </p>
            <form onSubmit={handleCancelSlotAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
                <input type="text" value={cancelReasonAdmin} onChange={(e) => setCancelReasonAdmin(e.target.value)} placeholder="Optional" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={cancelSavingAdmin} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{cancelSavingAdmin ? 'Cancelling…' : 'Cancel slot'}</button>
                <button type="button" onClick={() => { setCancelSlotAdmin(null); setCancelReasonAdmin(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Back</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending requests – easy to spot */}
      {registrations.filter((r) => r.status === 'requested').length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
          <h2 className="font-semibold text-amber-900 mb-1">
            Pending requests: {registrations.filter((r) => r.status === 'requested').length}
          </h2>
          <p className="text-sm text-amber-800 mb-3">
            Set date, time, and Meet link for each so the aspirant gets the link in Messages and on their Mocks page.
          </p>
        </div>
      )}

      {/* All registrations (history) */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-8">
        <h2 className="text-lg font-semibold text-slate-900 px-4 pt-4 pb-2">All registrations (history)</h2>
        <p className="text-sm text-slate-600 px-4 pb-4">All mock requests and bookings. Requested, scheduled, completed, no-show, and cancelled.</p>
        {/* Desktop: scrollable table, Action column sticky right */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Student</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Availability</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Registered</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Interviewer</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Scheduled at</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Meet link</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Scores</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Completed at</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700">Conducted</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-700 bg-white sticky right-0 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] min-w-[180px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No mock registrations yet.
                  </td>
                </tr>
              ) : (
                [...registrations]
                .sort((a, b) => {
                  const order = { requested: 0, scheduled: 1, completed: 2, no_show: 3, cancelled: 4 };
                  return (order[a.status] ?? 5) - (order[b.status] ?? 5);
                })
                .map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">{r.aspirant_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.aspirant_email ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate" title={r.availability_notes ?? ''}>{r.availability_notes ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.interviewer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDateTime(r.scheduled_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      {r.meet_link ? (
                        <a href={r.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                          <HiLink className="w-4 h-4 shrink-0" /> Join
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {r.status === 'completed' && [r.technical_score, r.communication_score, r.problem_solving_score, r.overall_score].every((n) => n != null)
                        ? `T:${r.technical_score} C:${r.communication_score} P:${r.problem_solving_score} O:${r.overall_score}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDateTime(r.completed_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'requested'
                              ? 'bg-amber-100 text-amber-700'
                              : r.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-700'
                                : r.status === 'no_show'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{byAspirant[r.aspirant_id] ?? 0}</td>
                    <td className="px-4 py-3 bg-white sticky right-0 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] min-w-[200px]">
                      {r.status === 'requested' && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openScheduleModal(r)} className="text-sm font-medium text-indigo-600 hover:underline whitespace-nowrap">Set schedule</button>
                          <button type="button" onClick={() => handleCancelSlot(r)} className="text-sm font-medium text-slate-600 hover:underline whitespace-nowrap">Cancel slot</button>
                        </div>
                      )}
                      {r.status === 'scheduled' && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openScheduleModal(r)} className="text-sm font-medium text-indigo-600 hover:underline whitespace-nowrap">Edit schedule</button>
                          <button type="button" onClick={() => handleMarkCompleted(r)} disabled={completingId === r.id} className="text-sm font-medium text-emerald-600 hover:underline whitespace-nowrap disabled:opacity-50">{completingId === r.id ? '…' : 'Mark completed'}</button>
                          <button type="button" onClick={() => handleMarkNoShow(r)} className="text-sm font-medium text-red-600 hover:underline whitespace-nowrap">No-show</button>
                        </div>
                      )}
                      {(r.status === 'completed' || r.status === 'no_show' || r.status === 'cancelled') && '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / small: cards with actions always visible */}
        <div className="md:hidden divide-y divide-slate-200">
          {registrations.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">No mock registrations yet.</div>
          ) : (
            registrations.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{r.aspirant_name ?? '—'}</p>
                    <p className="text-sm text-slate-600 truncate">{r.aspirant_email ?? '—'}</p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                      r.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'requested'
                          ? 'bg-amber-100 text-amber-700'
                          : r.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : r.status === 'no_show'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.availability_notes && (
                  <p className="text-sm text-slate-600 mb-1 truncate" title={r.availability_notes}>Availability: {r.availability_notes}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mb-3">
                  <span>Reg: {formatDate(r.created_at)}</span>
                  {r.scheduled_at && <span>Scheduled: {formatDateTime(r.scheduled_at)}</span>}
                  {r.meet_link && (
                    <a href={r.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 inline-flex items-center gap-1">
                      <HiLink className="w-3.5 h-3.5" /> Join Meet
                    </a>
                  )}
                </div>
                {r.status === 'requested' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => openScheduleModal(r)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">Set schedule</button>
                    <button type="button" onClick={() => handleCancelSlot(r)} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium">Cancel slot</button>
                  </div>
                )}
                {r.status === 'scheduled' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => openScheduleModal(r)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">Edit schedule</button>
                    <button type="button" onClick={() => handleMarkCompleted(r)} disabled={completingId === r.id} className="px-3 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-medium disabled:opacity-50">{completingId === r.id ? <ButtonLoader label="Updating…" /> : 'Mark completed'}</button>
                    <button type="button" onClick={() => handleMarkNoShow(r)} className="px-3 py-2 rounded-lg border border-red-600 text-red-700 text-sm font-medium">No-show</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Set schedule</h3>
            <p className="text-sm text-slate-600 mb-4">For {scheduleModal.aspirant_name ?? scheduleModal.aspirant_email}</p>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Google Meet link</label>
                <input
                  type="url"
                  value={scheduleForm.meetLink}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, meetLink: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin notes (internal)</label>
                <input
                  type="text"
                  value={scheduleForm.adminNotes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, adminNotes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={scheduleForm.notify}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, notify: e.target.checked }))}
                  className="rounded"
                />
                Notify aspirant (sends message to Messages + Mocks page)
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={scheduleSaving} className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50">
                  {scheduleSaving ? <ButtonLoader label="Saving…" /> : 'Save schedule'}
                </button>
                <button type="button" onClick={() => setScheduleModal(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed by date (report) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <HiCalendarDays className="w-5 h-5" />
          Completed mocks by date
        </h2>
        <p className="text-slate-600 text-sm mb-4">
          Who took the mock, scheduled time, completed time. Filter by date range.
        </p>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sort by</label>
            <select
              value={reportSortBy}
              onChange={(e) => setReportSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Default (date)</option>
              <option value="technical_score">Technical score</option>
              <option value="communication_score">Communication score</option>
              <option value="problem_solving_score">Problem solving score</option>
              <option value="overall_score">Overall score</option>
              <option value="completed_at">Completed at</option>
              <option value="scheduled_at">Scheduled at</option>
              <option value="aspirant_name">Aspirant name</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Order</label>
            <select
              value={reportOrder}
              onChange={(e) => setReportOrder(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Completed date</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Aspirant</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Interviewer</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Scheduled at</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Completed at</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Scores (T/C/P/O)</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Meet link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedReport.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">No completed mocks in this range.</td>
                </tr>
              ) : (
                completedReport.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{formatDate(r.completed_at ?? r.scheduled_at ?? r.created_at)}</td>
                    <td className="px-3 py-2 text-slate-900">{r.aspirant_name ?? r.aspirant_email ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.interviewer_name ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(r.scheduled_at)}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(r.completed_at)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {[r.technical_score, r.communication_score, r.problem_solving_score, r.overall_score].every((n) => n != null)
                        ? `T:${r.technical_score} C:${r.communication_score} P:${r.problem_solving_score} O:${r.overall_score}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.meet_link ? (
                        <a href={r.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Join</a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Conducted per student */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <HiCheckCircle className="w-5 h-5" />
          Mocks conducted per student
        </h2>
        {Object.keys(byAspirant).length === 0 ? (
          <p className="text-slate-500 text-sm">No completed mocks yet.</p>
        ) : (
          <ul className="space-y-2">
            {registrations
              .filter((r, i, arr) => arr.findIndex((x) => x.aspirant_id === r.aspirant_id) === i)
              .map((r) => (
                <li key={r.aspirant_id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{r.aspirant_name ?? r.aspirant_email ?? r.aspirant_id}</span>
                  <span className="font-medium text-slate-900">{byAspirant[r.aspirant_id] ?? 0} conducted</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
