import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader, Loader } from '../../components/ui/Loader';
import { HiCalendarDays, HiLink, HiCheckCircle, HiUserGroup, HiClock, HiCalendar, HiClipboardDocumentList } from 'react-icons/hi2';
import MockFeedbackModal, { createEmptyMockFeedbackForm } from '../../components/mock/MockFeedbackModal';
import MockFeedbackDisplay from '../../components/mock/MockFeedbackDisplay';
import { formatFeedbackSummary, revertMockFeedback, submitMockFeedback } from '../../lib/mockFeedback';
import { isValidHttpUrl, normalizeHttpUrl } from '../../lib/aspirantProfile';
import { slotDurationMinutes, endAtFromStartAndMinutes } from '../../lib/mockSlotTiming';

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

function PendingRequestRow({ registration, interviewers, onAssign, onSchedule, onDetail, formatDate: fmtDate }) {
  const [interviewerId, setInterviewerId] = useState(registration.interviewer_id ?? '');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setInterviewerId(registration.interviewer_id ?? '');
  }, [registration.interviewer_id, registration.id]);

  const handleAssign = async (e) => {
    e.stopPropagation();
    if (!interviewerId) return;
    setAssigning(true);
    await onAssign(registration, interviewerId);
    setAssigning(false);
  };

  return (
    <tr className="hover:bg-amber-50/30">
      <td className="px-4 py-2.5">
        <button type="button" onClick={onDetail} className="text-left hover:underline">
          <span className="font-medium text-slate-900">{registration.aspirant_name ?? '—'}</span>
          {registration.aspirant_email ? (
            <span className="block text-xs text-slate-500 truncate max-w-[180px]">{registration.aspirant_email}</span>
          ) : null}
        </button>
      </td>
      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(registration.created_at)}</td>
      <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[200px]">
        {registration.availability_notes ? (
          <span className="line-clamp-2" title={registration.availability_notes}>{registration.availability_notes}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={interviewerId}
            onChange={(e) => setInterviewerId(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Select…</option>
            {interviewers.map((i) => (
              <option key={i.id} value={i.id}>{i.name ?? i.email}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!interviewerId || assigning}
            className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {assigning ? '…' : 'Assign'}
          </button>
        </div>
        {registration.interviewer_name ? (
          <p className="mt-1 text-xs text-emerald-700">Current: {registration.interviewer_name}</p>
        ) : (
          <p className="mt-1 text-xs text-amber-700">Not assigned yet</p>
        )}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onSchedule}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          Set schedule
        </button>
      </td>
    </tr>
  );
}

const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // used by slot forms only

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
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
  const [scheduleModal, setScheduleModal] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: '', meetLink: '', adminNotes: '', interviewerId: '', notify: true });
  const [flash, setFlash] = useState({ type: '', text: '' });
  const [interviewers, setInterviewers] = useState([]);
  const [createSlotsForm, setCreateSlotsForm] = useState({ interviewerId: '', date: '', startTime: '14:00', numSlots: 4, durationPreset: '25', durationCustom: 25, meetLink: '' });
  const [createSlotsSaving, setCreateSlotsSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsFrom, setSlotsFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [slotsTo, setSlotsTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [slotsInterviewerId, setSlotsInterviewerId] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduleSlotAdmin, setRescheduleSlotAdmin] = useState(null);
  const [rescheduleFormAdmin, setRescheduleFormAdmin] = useState({ start: '', durationMins: 25 });
  const [rescheduleReasonAdmin, setRescheduleReasonAdmin] = useState('');
  const [rescheduleSavingAdmin, setRescheduleSavingAdmin] = useState(false);
  const [cancelSlotAdmin, setCancelSlotAdmin] = useState(null);
  const [cancelReasonAdmin, setCancelReasonAdmin] = useState('');
  const [cancelSavingAdmin, setCancelSavingAdmin] = useState(false);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [rejectRescheduleModal, setRejectRescheduleModal] = useState(null);
  const [rejectRescheduleMessage, setRejectRescheduleMessage] = useState('');
  const [rejectRescheduleSaving, setRejectRescheduleSaving] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [completeForm, setCompleteForm] = useState(() => createEmptyMockFeedbackForm());
  const [completeSaving, setCompleteSaving] = useState(false);
  const [revertSaving, setRevertSaving] = useState(false);
  const [registrationDetailModal, setRegistrationDetailModal] = useState(null);
  const [detailAssignInterviewerId, setDetailAssignInterviewerId] = useState('');
  const [registrationsPage, setRegistrationsPage] = useState(0);
  const [registrationsSearch, setRegistrationsSearch] = useState('');
  const [registrationsStatusFilter, setRegistrationsStatusFilter] = useState('');
  const [createSlotsModalOpen, setCreateSlotsModalOpen] = useState(false);

  const REGISTRATIONS_PAGE_SIZE = 50;
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const order = { requested: 0, scheduled: 1, completed: 2, no_show: 3, cancelled: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });
  const searchLower = registrationsSearch.trim().toLowerCase();
  const filteredRegistrations = sortedRegistrations.filter((r) => {
    const matchSearch = !searchLower ||
      (r.aspirant_name ?? '').toLowerCase().includes(searchLower) ||
      (r.aspirant_email ?? '').toLowerCase().includes(searchLower);
    const matchStatus = !registrationsStatusFilter || r.status === registrationsStatusFilter;
    return matchSearch && matchStatus;
  });
  const paginatedRegistrations = filteredRegistrations.slice(
    registrationsPage * REGISTRATIONS_PAGE_SIZE,
    (registrationsPage + 1) * REGISTRATIONS_PAGE_SIZE
  );
  const totalRegistrationPages = Math.max(1, Math.ceil(filteredRegistrations.length / REGISTRATIONS_PAGE_SIZE));

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

  const fetchRescheduleRequests = () => {
    supabase.rpc('get_admin_mock_reschedule_requests').then(({ data }) => setRescheduleRequests(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchRescheduleRequests();
  }, []);

  const handleCreateSlots = async (e) => {
    e.preventDefault();
    if (!createSlotsForm.interviewerId || !createSlotsForm.date || !createSlotsForm.startTime || !createSlotsForm.numSlots || createSlotsForm.numSlots < 1) {
      setFlashMsg('error', 'Select interviewer, date, start time, and number of slots.');
      return;
    }
    const durationMins = createSlotsForm.durationPreset === 'custom'
      ? Math.min(60, Math.max(15, Number(createSlotsForm.durationCustom) || 25))
      : Number(createSlotsForm.durationPreset);
    if (durationMins < 15 || durationMins > 60) {
      setFlashMsg('error', 'Slot duration must be between 15 and 60 minutes.');
      return;
    }
    if (!isValidHttpUrl(createSlotsForm.meetLink)) {
      setFlashMsg('error', 'Enter a valid Google Meet link (https://meet.google.com/...).');
      return;
    }
    const meetLink = normalizeHttpUrl(createSlotsForm.meetLink);
    const startAt = new Date(`${createSlotsForm.date}T${createSlotsForm.startTime}:00`);
    const endAt = new Date(startAt.getTime() + createSlotsForm.numSlots * durationMins * 60 * 1000);
    setCreateSlotsSaving(true);
    const { data } = await supabase.rpc('create_mock_slots', {
      p_interviewer_id: createSlotsForm.interviewerId,
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_slot_duration_mins: durationMins,
      p_meet_link: meetLink,
    });
    setCreateSlotsSaving(false);
    if (data?.ok) {
      setFlashMsg('success', 'Slots created. Aspirants can book them from the Mocks page.');
      setCreateSlotsForm((f) => ({ ...f, interviewerId: '', date: '', meetLink: '' }));
      setCreateSlotsModalOpen(false);
      fetchSlots();
      fetchMocks();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to create slots.');
    }
  };

  const openCompleteModal = (r) => {
    setCompleteModal(r);
    setCompleteForm(createEmptyMockFeedbackForm());
  };

  const handleCompleteSubmit = async (form) => {
    if (!completeModal) return;
    setCompleteSaving(true);
    const result = await submitMockFeedback(supabase, completeModal.id, form);
    setCompleteSaving(false);
    if (result?.ok) {
      setCompleteModal(null);
      fetchMocks();
      fetchSlots();
      fetchCompletedReport();
      setFlashMsg('success', 'Mock completed with feedback. Student was notified.');
    } else {
      setFlashMsg('error', result?.error ?? 'Failed.');
    }
  };

  const handleRevertFeedback = async (registration) => {
    const name = registration.aspirant_name ?? registration.aspirant_email ?? 'this student';
    const ok = window.confirm(
      `Remove all feedback for ${name} and set this mock back to scheduled?\n\nThe time slot and Meet link stay the same. Feedback notifications and placement-ready (if set from this mock) will be undone.`,
    );
    if (!ok) return;

    setRevertSaving(true);
    const result = await revertMockFeedback(supabase, registration.id);
    setRevertSaving(false);

    if (result?.ok) {
      setRegistrationDetailModal(null);
      fetchMocks();
      fetchSlots();
      fetchCompletedReport();
      setFlashMsg('success', 'Feedback removed. Mock is scheduled again — interviewer can submit correct feedback after the session.');
    } else {
      setFlashMsg('error', result?.error ?? 'Failed to revert feedback.');
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

  const openRegistrationDetail = (registration) => {
    setRegistrationDetailModal(registration);
    setDetailAssignInterviewerId(registration.interviewer_id ?? '');
  };

  const openScheduleModal = (r) => {
    setScheduleModal(r);
    const d = r.scheduled_at ? new Date(r.scheduled_at) : new Date();
    const local = d.toISOString().slice(0, 16);
    setScheduleForm({
      scheduledAt: local,
      meetLink: r.meet_link ?? '',
      adminNotes: r.admin_notes ?? '',
      interviewerId: r.interviewer_id ?? '',
      notify: true,
    });
  };

  const handleAssignInterviewer = async (registration, interviewerId) => {
    if (!registration?.id || !interviewerId) {
      setFlashMsg('error', 'Select an interviewer.');
      return;
    }
    const { data } = await supabase.rpc('admin_assign_mock_interviewer', {
      p_registration_id: registration.id,
      p_interviewer_id: interviewerId,
    });
    if (data?.ok) {
      fetchMocks();
      setRegistrationDetailModal((prev) =>
        prev?.id === registration.id
          ? { ...prev, interviewer_id: interviewerId, interviewer_name: interviewers.find((i) => i.id === interviewerId)?.name }
          : prev
      );
      setFlashMsg('success', 'Interviewer assigned. They will see this request in My Mocks.');
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to assign interviewer.');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleModal) return;
    if (!scheduleForm.interviewerId) {
      setFlashMsg('error', 'Select an interviewer to assign.');
      return;
    }
    if (!scheduleForm.scheduledAt) {
      setFlashMsg('error', 'Date and time required.');
      return;
    }
    setScheduleSaving(true);
    const scheduledAt = scheduleForm.scheduledAt ? new Date(scheduleForm.scheduledAt).toISOString() : null;
    const { data } = await supabase.rpc('admin_schedule_mock', {
      p_registration_id: scheduleModal.id,
      p_scheduled_at: scheduledAt,
      p_meet_link: scheduleForm.meetLink.trim() || null,
      p_admin_notes: scheduleForm.adminNotes.trim() || null,
      p_interviewer_id: scheduleForm.interviewerId,
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
      setFlashMsg('success', 'Schedule saved and interviewer assigned.');
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to save schedule.');
    }
  };

  const openRescheduleSlotAdmin = (slot) => {
    setRescheduleSlotAdmin(slot);
    setRescheduleReasonAdmin('');
    setRescheduleFormAdmin({
      start: new Date(slot.start_at).toISOString().slice(0, 16),
      durationMins: slotDurationMinutes(slot.start_at, slot.end_at),
    });
  };

  const handleRescheduleSlotAdminSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSlotAdmin) return;
    const startAt = new Date(rescheduleFormAdmin.start);
    const endAt = endAtFromStartAndMinutes(rescheduleFormAdmin.start, rescheduleFormAdmin.durationMins);
    if (isNaN(startAt.getTime())) {
      setFlashMsg('error', 'Enter a valid date and time.');
      return;
    }
    setRescheduleSavingAdmin(true);
    const { data } = await supabase.rpc('reschedule_mock_slot', {
      p_slot_id: rescheduleSlotAdmin.id,
      p_new_start_at: startAt.toISOString(),
      p_new_end_at: endAt.toISOString(),
      p_reason: rescheduleReasonAdmin.trim() || null,
    });
    setRescheduleSavingAdmin(false);
    if (data?.ok) {
      setRescheduleSlotAdmin(null);
      setRescheduleReasonAdmin('');
      setFlashMsg('success', 'Slot rescheduled. Aspirant was notified via Messages.');
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
      setFlashMsg('success', 'Slot cancelled. Aspirant was notified via Messages.');
      fetchSlots();
      fetchMocks();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to cancel.');
    }
  };

  const handleApproveRescheduleRequest = async (req) => {
    const { data } = await supabase.rpc('admin_approve_mock_reschedule', { p_request_id: req.id });
    if (data?.ok) {
      setRescheduleRequests((prev) => prev.filter((x) => x.id !== req.id));
      setFlashMsg('success', 'Request approved. Set new schedule below.');
      const reg = registrations.find((r) => r.id === req.mock_registration_id);
      if (reg) openScheduleModal(reg);
      fetchRescheduleRequests();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to approve.');
    }
  };

  const handleRejectRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rejectRescheduleModal) return;
    setRejectRescheduleSaving(true);
    const { data } = await supabase.rpc('admin_reject_mock_reschedule', {
      p_request_id: rejectRescheduleModal.id,
      p_message_to_aspirant: rejectRescheduleMessage.trim() || 'Your reschedule request could not be approved.',
    });
    setRejectRescheduleSaving(false);
    if (data?.ok) {
      setRejectRescheduleModal(null);
      setRejectRescheduleMessage('');
      setFlashMsg('success', 'Request rejected. Aspirant will see your message in Messages.');
      fetchRescheduleRequests();
    } else {
      setFlashMsg('error', data?.error ?? 'Failed to reject.');
    }
  };

  if (loading) {
    return <PageLoader size="md" label="Loading mock registrations…" className="py-12" />;
  }

  const slotsAvailable = slots.filter((s) => s.status === 'available').length;
  const slotsBooked = slots.filter((s) => s.status === 'booked').length;
  const slotsCancelled = slots.filter((s) => s.status === 'cancelled').length;
  const pendingRequestList = registrations.filter((r) => r.status === 'requested');
  const pendingRequests = pendingRequestList.length;
  const unassignedPending = pendingRequestList.filter((r) => !r.interviewer_id).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mock interviews</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Interviewers publish their own availability; use this page when you need to create slots on their behalf.
          </p>
        </div>
      </div>

      {flash.text && (
        <div className={`rounded-lg px-4 py-2 text-sm ${flash.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {flash.text}
        </div>
      )}

      {/* Dashboard stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Waiting for slot" value={pendingRequests} icon={HiUserGroup} />
        <StatCard label="Reschedule requests" value={rescheduleRequests.length} icon={HiClock} />
        <StatCard label="Available slots" value={slotsAvailable} icon={HiCalendar} />
        <StatCard label="Booked slots" value={slotsBooked} icon={HiClipboardDocumentList} />
        <StatCard label="Completed (report range)" value={completedReport.length} icon={HiCheckCircle} />
      </div>

      {/* Your slots — full width */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your slots</h2>
            <p className="text-sm text-slate-600 mt-0.5">Filter by date and interviewer. Reschedule or cancel from the row; students are notified if booked.</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateSlotsModalOpen(true)}
            disabled={interviewers.length === 0}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Create new slots
          </button>
        </div>
        <div className="p-5">
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
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center">
            <p className="text-slate-600 font-medium">No slots in this date range</p>
            <p className="text-sm text-slate-500 mt-1">Click <strong>Create new slots</strong> or try a wider date range.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-700 mb-3">
              <strong>{slots.length}</strong> slot{slots.length !== 1 ? 's' : ''} in range
              {slotsAvailable + slotsBooked + slotsCancelled > 0 && (
                <span className="text-slate-500 font-normal ml-2">
                  — {slotsAvailable} available, {slotsBooked} booked, {slotsCancelled} cancelled
                </span>
              )}
            </p>
            <div className="overflow-auto max-h-[400px] rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Time</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Interviewer</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Booked by</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Meet</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {slots.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-900 whitespace-nowrap">
                        {formatDate(s.start_at)} · {new Date(s.start_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(s.end_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{s.interviewer_name ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'booked' ? 'bg-green-100 text-green-800' : s.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
                          {s.status === 'available' ? 'Available' : s.status === 'booked' ? 'Booked' : 'Cancelled'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {s.aspirant_name ? <>{s.aspirant_name}{s.aspirant_email && <span className="block text-xs text-slate-500">{s.aspirant_email}</span>}</> : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {s.meet_link ? <a href={s.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Join</a> : '—'}
                      </td>
                      <td className="px-4 py-2.5">
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
          </>
        )}
        </div>
      </section>

      {/* Create new slots modal */}
      {createSlotsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !createSlotsSaving && setCreateSlotsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
              <h3 className="text-lg font-semibold text-slate-900">Create new slots</h3>
              <button type="button" onClick={() => !createSlotsSaving && setCreateSlotsModalOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label="Close">×</button>
            </div>
            <div className="p-5">
              {createSlotsForm.date && createSlotsForm.startTime && createSlotsForm.numSlots >= 1 && (() => {
                const durationMins = createSlotsForm.durationPreset === 'custom'
                  ? Math.min(60, Math.max(15, Number(createSlotsForm.durationCustom) || 25))
                  : Number(createSlotsForm.durationPreset);
                const startAt = new Date(`${createSlotsForm.date}T${createSlotsForm.startTime}:00`);
                const endAt = new Date(startAt.getTime() + createSlotsForm.numSlots * durationMins * 60 * 1000);
                const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
                return (
                  <p className="text-sm text-slate-600 mb-4">End time: <strong className="text-slate-900">{fmt(endAt)}</strong> (slots from {fmt(startAt)} to {fmt(endAt)})</p>
                );
              })()}
              <form onSubmit={handleCreateSlots} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interviewer</label>
                    <select
                      value={createSlotsForm.interviewerId}
                      onChange={(e) => setCreateSlotsForm((f) => ({ ...f, interviewerId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
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
                    <input type="date" value={createSlotsForm.date} onChange={(e) => setCreateSlotsForm((f) => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start time</label>
                    <input type="time" value={createSlotsForm.startTime} onChange={(e) => setCreateSlotsForm((f) => ({ ...f, startTime: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of slots</label>
                    <input type="number" min={1} max={24} value={createSlotsForm.numSlots} onChange={(e) => setCreateSlotsForm((f) => ({ ...f, numSlots: Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 1)) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Slot duration</label>
                    <select value={createSlotsForm.durationPreset} onChange={(e) => setCreateSlotsForm((f) => ({ ...f, durationPreset: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                      <option value="15">15 min</option>
                      <option value="20">20 min</option>
                      <option value="25">25 min</option>
                      <option value="30">30 min</option>
                      <option value="40">40 min</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {createSlotsForm.durationPreset === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Custom (minutes)</label>
                      <input type="number" min={15} max={60} value={createSlotsForm.durationCustom} onChange={(e) => setCreateSlotsForm((f) => ({ ...f, durationCustom: Math.min(60, Math.max(15, parseInt(e.target.value, 10) || 15)) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Google Meet link <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    value={createSlotsForm.meetLink}
                    onChange={(e) => setCreateSlotsForm((f) => ({ ...f, meetLink: e.target.value }))}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Required. Same link for all slots in this window.</p>
                </div>
                {interviewers.length === 0 && <p className="text-sm text-amber-700">Mark at least one admin as Interviewer on the Admins page to create slots.</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setCreateSlotsModalOpen(false)} disabled={createSlotsSaving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={createSlotsSaving || interviewers.length === 0 || !createSlotsForm.meetLink.trim()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{createSlotsSaving ? 'Creating…' : 'Create slots'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule slot modal (admin) */}
      {rescheduleSlotAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reschedule slot</h3>
            <p className="text-sm text-slate-600 mb-4">
              {formatDateTime(rescheduleSlotAdmin.start_at)} – {rescheduleSlotAdmin.interviewer_name}
              {rescheduleSlotAdmin.aspirant_name && <span className="block mt-1">Booked by: {rescheduleSlotAdmin.aspirant_name}</span>}
            </p>
            <p className="text-sm text-slate-600 mb-4">
              The aspirant will be notified via Messages with the new time and reason.
            </p>
            <form onSubmit={handleRescheduleSlotAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New date & time</label>
                <input type="datetime-local" value={rescheduleFormAdmin.start} onChange={(e) => setRescheduleFormAdmin((f) => ({ ...f, start: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <select
                  value={rescheduleFormAdmin.durationMins}
                  onChange={(e) => setRescheduleFormAdmin((f) => ({ ...f, durationMins: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason (recommended)</label>
                <textarea
                  value={rescheduleReasonAdmin}
                  onChange={(e) => setRescheduleReasonAdmin(e.target.value)}
                  placeholder="e.g. Technical issue with original slot / Meet link"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={rescheduleSavingAdmin} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{rescheduleSavingAdmin ? 'Saving…' : 'Reschedule & notify'}</button>
                <button type="button" onClick={() => { setRescheduleSlotAdmin(null); setRescheduleReasonAdmin(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
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
            <p className="text-sm text-slate-600 mb-4">
              The aspirant will be notified via Messages. Add a reason (e.g. technical issue).
            </p>
            <form onSubmit={handleCancelSlotAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for aspirant</label>
                <textarea
                  value={cancelReasonAdmin}
                  onChange={(e) => setCancelReasonAdmin(e.target.value)}
                  placeholder="e.g. Slot no longer available / Meet link issue"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={cancelSavingAdmin} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{cancelSavingAdmin ? 'Cancelling…' : 'Cancel slot'}</button>
                <button type="button" onClick={() => { setCancelSlotAdmin(null); setCancelReasonAdmin(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Back</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete mock – must enter scores (admin cannot mark completed without feedback) */}
      <MockFeedbackModal
        open={!!completeModal}
        registration={completeModal}
        value={completeForm}
        onChange={setCompleteForm}
        onSubmit={handleCompleteSubmit}
        submitting={completeSaving}
        onClose={() => setCompleteModal(null)}
        title="Complete mock & add feedback"
        submitLabel="Complete & notify student"
      />

      {/* Reject reschedule request modal */}
      {rejectRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reject reschedule request</h3>
            <p className="text-sm text-slate-600 mb-4">
              {rejectRescheduleModal.aspirant_name ?? rejectRescheduleModal.aspirant_email} – {formatDateTime(rejectRescheduleModal.scheduled_at)}. Your message will be sent to the aspirant via Messages.
            </p>
            <form onSubmit={handleRejectRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message to aspirant</label>
                <textarea value={rejectRescheduleMessage} onChange={(e) => setRejectRescheduleMessage(e.target.value)} placeholder="e.g. We couldn’t accommodate a new slot. Please join at the scheduled time." rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={rejectRescheduleSaving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{rejectRescheduleSaving ? 'Sending…' : 'Reject & send message'}</button>
                <button type="button" onClick={() => { setRejectRescheduleModal(null); setRejectRescheduleMessage(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule requests */}
      {rescheduleRequests.length > 0 && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Reschedule requests</h2>
          <p className="text-sm text-slate-600 mb-4">Approve and set a new time, or reject with a message (they see it in Messages).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Aspirant</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Scheduled</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Reason</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rescheduleRequests.map((req) => (
                  <tr key={req.id} className="bg-white hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-900">
                      {req.aspirant_name ?? '—'}
                      {req.aspirant_email && <span className="block text-xs text-slate-500">{req.aspirant_email}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(req.scheduled_at)}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[240px]">{req.reason ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleApproveRescheduleRequest(req)} className="text-sm font-medium text-indigo-600 hover:underline">Approve</button>
                        <button type="button" onClick={() => { setRejectRescheduleModal(req); setRejectRescheduleMessage(''); }} className="text-sm font-medium text-red-600 hover:underline">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Students waiting for a slot — assign interviewer + schedule */}
      {pendingRequests > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200/80">
            <p className="text-sm font-medium text-amber-950">
              <strong>{pendingRequests}</strong> mock request{pendingRequests !== 1 ? 's' : ''} waiting
              {unassignedPending > 0 ? (
                <span className="font-normal text-amber-800"> · {unassignedPending} unassigned</span>
              ) : null}
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Assign an interviewer (visible to all interviewers in their request queue), then set date, time, and Meet link.
            </p>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 font-semibold text-slate-700">Student</th>
                  <th className="px-4 py-2 font-semibold text-slate-700">Requested</th>
                  <th className="px-4 py-2 font-semibold text-slate-700">Notes</th>
                  <th className="px-4 py-2 font-semibold text-slate-700 min-w-[200px]">Assign interviewer</th>
                  <th className="px-4 py-2 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequestList.map((r) => (
                  <PendingRequestRow
                    key={r.id}
                    registration={r}
                    interviewers={interviewers}
                    onAssign={handleAssignInterviewer}
                    onSchedule={() => openScheduleModal(r)}
                    onDetail={() => openRegistrationDetail(r)}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* All mock registrations: search + filter + compact table, click row → detail modal */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-900 px-4 pt-4 pb-1">All mock registrations</h2>
        <p className="text-sm text-slate-600 px-4 pb-2">Search or filter. Click a row for full details. Assign interviewer on pending requests above or when scheduling.</p>
        <div className="px-4 pb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={registrationsSearch}
            onChange={(e) => { setRegistrationsSearch(e.target.value); setRegistrationsPage(0); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56 placeholder:text-slate-400"
          />
          <select
            value={registrationsStatusFilter}
            onChange={(e) => { setRegistrationsStatusFilter(e.target.value); setRegistrationsPage(0); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="no_show">No-show</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="text-sm text-slate-500">
            {filteredRegistrations.length === registrations.length
              ? `${registrations.length} total`
              : `${filteredRegistrations.length} of ${registrations.length}`}
          </span>
        </div>
        <div className="overflow-auto max-h-[420px] border-t border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Student</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Interviewer</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Registered</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Scheduled</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700 w-8" aria-label="View" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {registrations.length === 0 ? 'No mock registrations yet.' : 'No matches. Try a different search or filter.'}
                  </td>
                </tr>
              ) : (
                paginatedRegistrations.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openRegistrationDetail(r)}
                    className="hover:bg-indigo-50/50 cursor-pointer group"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-900">{r.aspirant_name ?? '—'}</span>
                      {r.aspirant_email && <span className="block text-xs text-slate-500 truncate max-w-[200px]">{r.aspirant_email}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'requested' ? 'bg-amber-100 text-amber-700'
                            : r.status === 'scheduled' ? 'bg-blue-100 text-blue-700'
                            : r.status === 'no_show' ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs max-w-[140px]">
                      {r.interviewer_name ? (
                        <span className="font-medium text-slate-800">{r.interviewer_name}</span>
                      ) : r.status === 'requested' ? (
                        <span className="text-amber-700">Unassigned</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{r.scheduled_at ? formatDateTime(r.scheduled_at) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 group-hover:bg-indigo-100 transition-colors">View details</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredRegistrations.length > REGISTRATIONS_PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Page {registrationsPage + 1} of {totalRegistrationPages} ({filteredRegistrations.length} shown)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRegistrationsPage((p) => Math.max(0, p - 1))}
                disabled={registrationsPage === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setRegistrationsPage((p) => Math.min(totalRegistrationPages - 1, p + 1))}
                disabled={registrationsPage >= totalRegistrationPages - 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Registration detail modal: wide, no scroll, content in grid */}
      {registrationDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setRegistrationDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <h3 className="text-lg font-semibold text-slate-900">Registration details</h3>
              <button type="button" onClick={() => setRegistrationDetailModal(null)} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors" aria-label="Close">
                ×
              </button>
            </div>
            {/* Body: two columns, no scroll */}
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left column */}
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Student</p>
                  <p className="font-semibold text-slate-900">{registrationDetailModal.aspirant_name ?? '—'}</p>
                  <p className="text-slate-600 text-sm mt-0.5">{registrationDetailModal.aspirant_email ?? '—'}</p>
                  <span
                    className={`inline-flex mt-2 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      registrationDetailModal.status === 'completed' ? 'bg-emerald-100 text-emerald-800'
                        : registrationDetailModal.status === 'requested' ? 'bg-amber-100 text-amber-800'
                        : registrationDetailModal.status === 'scheduled' ? 'bg-blue-100 text-blue-800'
                        : registrationDetailModal.status === 'no_show' ? 'bg-red-100 text-red-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {registrationDetailModal.status}
                  </span>
                </div>
                {registrationDetailModal.availability_notes ? (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preferred date, time & notes</p>
                    <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{registrationDetailModal.availability_notes}</p>
                  </div>
                ) : null}
              </div>
              {/* Right column */}
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Schedule</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><dt className="text-slate-500">Registered on</dt><dd className="font-medium text-slate-900">{formatDate(registrationDetailModal.created_at)}</dd></div>
                    <div><dt className="text-slate-500">Scheduled at</dt><dd className="font-medium text-slate-900">{registrationDetailModal.scheduled_at ? formatDateTime(registrationDetailModal.scheduled_at) : '—'}</dd></div>
                    <div><dt className="text-slate-500">Interviewer</dt><dd className="font-medium text-slate-900">{registrationDetailModal.interviewer_name ?? '—'}</dd></div>
                    <div><dt className="text-slate-500">Mocks conducted</dt><dd className="font-medium text-slate-900">{byAspirant[registrationDetailModal.aspirant_id] ?? 0}</dd></div>
                  </dl>
                </div>
                {registrationDetailModal.status === 'requested' && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                    <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2">Assign interviewer</p>
                    <p className="text-sm text-slate-600 mb-3">
                      Assign before scheduling so the interviewer sees this request in My Mocks, or pick one when you set the schedule.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={detailAssignInterviewerId}
                        onChange={(e) => setDetailAssignInterviewerId(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Select interviewer…</option>
                        {interviewers.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name ?? i.email}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignInterviewer(registrationDetailModal, detailAssignInterviewerId)}
                        disabled={!detailAssignInterviewerId}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
                {registrationDetailModal.meet_link ? (
                  <div className="rounded-xl bg-indigo-50/80 border border-indigo-200 p-4">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">Meeting link</p>
                    <a href={registrationDetailModal.meet_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-indigo-700 font-medium hover:underline">
                      <HiLink className="w-4 h-4 shrink-0" /> Open meeting link
                    </a>
                  </div>
                ) : null}
                {registrationDetailModal.status === 'completed' ? (
                  <MockFeedbackDisplay registration={registrationDetailModal} showAdminFields />
                ) : null}
              </div>
            </div>
            {/* Footer: actions */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50/80 space-y-2">
              {registrationDetailModal.status === 'requested' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" onClick={() => { openScheduleModal(registrationDetailModal); setRegistrationDetailModal(null); }} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">Set schedule</button>
                  <button type="button" onClick={() => { handleCancelSlot(registrationDetailModal); setRegistrationDetailModal(null); }} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">Cancel slot</button>
                </div>
              )}
              {registrationDetailModal.status === 'scheduled' && (
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => { openCompleteModal(registrationDetailModal); setRegistrationDetailModal(null); }} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">Complete & add feedback</button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { openScheduleModal(registrationDetailModal); setRegistrationDetailModal(null); }} className="flex-1 rounded-xl border border-indigo-600 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 transition-colors">Edit schedule</button>
                    <button type="button" onClick={() => { handleMarkNoShow(registrationDetailModal); setRegistrationDetailModal(null); }} className="flex-1 rounded-xl border border-red-600 px-4 py-2.5 text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors">No-show</button>
                  </div>
                </div>
              )}
              {registrationDetailModal.status === 'completed' && (
                <button
                  type="button"
                  disabled={revertSaving}
                  onClick={() => handleRevertFeedback(registrationDetailModal)}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                >
                  {revertSaving ? 'Reverting…' : 'Revert feedback (back to scheduled)'}
                </button>
              )}
              <button type="button" onClick={() => setRegistrationDetailModal(null)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Set schedule</h3>
            <p className="text-sm text-slate-600 mb-4">For {scheduleModal.aspirant_name ?? scheduleModal.aspirant_email}</p>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign interviewer</label>
                <select
                  value={scheduleForm.interviewerId}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, interviewerId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select interviewer…</option>
                  {interviewers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name ?? i.email}
                    </option>
                  ))}
                </select>
                {interviewers.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-700">Mark an admin as Interviewer on the Admins page first.</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">This mock will appear in their My Mocks list.</p>
                )}
              </div>
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

      {/* Completed mocks by date — top */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <HiCalendarDays className="w-5 h-5 text-slate-600" />
            Completed mocks by date
          </h2>
          <p className="text-slate-600 text-sm mt-1">Filter by date range and sort by score or name.</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort by</label>
              <select value={reportSortBy} onChange={(e) => setReportSortBy(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-w-[160px]">
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
              <select value={reportOrder} onChange={(e) => setReportOrder(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div className="overflow-auto max-h-[360px] rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Aspirant</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Interviewer</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Scheduled</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Completed at</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Scores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {completedReport.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No completed mocks in this range.</td>
                  </tr>
                ) : (
                  completedReport.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{formatDate(r.completed_at ?? r.scheduled_at ?? r.created_at)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.aspirant_name ?? r.aspirant_email ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.interviewer_name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDateTime(r.scheduled_at)}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDateTime(r.completed_at)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatFeedbackSummary(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mocks conducted per student — bottom */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <HiCheckCircle className="w-5 h-5 text-slate-600" />
            Mocks conducted per student
          </h2>
          <p className="text-slate-600 text-sm mt-1">Total completed mocks per aspirant.</p>
        </div>
        <div className="p-5">
          {Object.keys(byAspirant).length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No completed mocks yet.</p>
          ) : (
            <div className="overflow-auto max-h-[320px] rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-700">Student</th>
                    <th className="px-4 py-2.5 font-semibold text-slate-700 text-right w-28">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {registrations
                    .filter((r, i, arr) => arr.findIndex((x) => x.aspirant_id === r.aspirant_id) === i)
                    .map((r) => (
                      <tr key={r.aspirant_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{r.aspirant_name ?? r.aspirant_email ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-700 text-right">
                          <span className="inline-flex items-center justify-center min-w-8 rounded-lg bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5">{byAspirant[r.aspirant_id] ?? 0}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
