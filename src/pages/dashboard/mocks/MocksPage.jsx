import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { normalizeHttpUrl, isAspirantProfileComplete } from '../../../lib/aspirantProfile';
import { isSubscriptionActive } from '../../../lib/planLimits';
import { getMockBookingGuidance } from '../../../lib/mockBookingGuidance';
import { useAppSelector } from '../../../store/hooks';
import { useProfileOnboardingGate } from '../hooks/useProfileOnboardingGate';
import { PageLoader } from '../../../components/ui/Loader';
import MockFeedbackDisplay from '../../../components/mock/MockFeedbackDisplay';
import CompleteProfileBanner from '../components/CompleteProfileBanner';
import { subscribeToAspirantMessages } from '../../../lib/messageRealtime';
import { MESSAGES_INVALIDATE_EVENT } from '../../../lib/messagesEvents';
import { HiCalendarDays, HiCheckCircle, HiClock, HiExclamationTriangle, HiInformationCircle, HiLink, HiMegaphone } from 'react-icons/hi2';

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

function formatSlotTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatPeriodDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MocksPage() {
  const aspirantProfile = useAppSelector((state) => state.aspirant.profile);
  const { profileComplete, goToOnboarding, requireCompleteProfile } = useProfileOnboardingGate();
  const hasActivePlan =
    aspirantProfile?.plan &&
    isSubscriptionActive(aspirantProfile.plan, aspirantProfile.plan_started_at);
  const showCompleteProfileBanner = hasActivePlan && !isAspirantProfileComplete(aspirantProfile);

  const [usage, setUsage] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [mockNotices, setMockNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsFrom, setSlotsFrom] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [slotsTo, setSlotsTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [confirmBookingSlot, setConfirmBookingSlot] = useState(null);
  const [slotMessage, setSlotMessage] = useState({ type: '', text: '' });
  const [requestWithoutSlot, setRequestWithoutSlot] = useState(false);
  const [requestPreferredDate, setRequestPreferredDate] = useState('');
  const [requestPreferredTime, setRequestPreferredTime] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestMessage, setRequestMessage] = useState({ type: '', text: '' });
  const [pendingRescheduleIds, setPendingRescheduleIds] = useState([]);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleMessage, setRescheduleMessage] = useState({ type: '', text: '' });
  const [infoOpen, setInfoOpen] = useState(false);
  const [noticesModalOpen, setNoticesModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const infoRef = useRef(null);
  const bookSectionRef = useRef(null);

  const withinMonthlyLimit = usage?.active && (usage.limit < 0 || usage.used < usage.limit);
  const pastBookingGap =
    !usage?.next_book_after || new Date(usage.next_book_after) <= new Date();
  const hasActiveMock = myRegistrations.some((r) => r.status === 'scheduled' || r.status === 'requested');
  const canBook = withinMonthlyLimit && pastBookingGap && !hasActiveMock;
  const canRequestMock = canBook;

  const mockGuidance = useMemo(
    () =>
      getMockBookingGuidance({
        usage,
        plan: aspirantProfile?.plan ?? null,
        planStartedAt: aspirantProfile?.plan_started_at ?? null,
      }),
    [usage, aspirantProfile?.plan, aspirantProfile?.plan_started_at],
  );

  const NOTICES_PREVIEW = 5;
  const unreadNoticeCount = mockNotices.filter((n) => !n.read_at).length;
  const latestCancelled = myRegistrations.find((r) => r.status === 'cancelled');
  const latestScheduled = myRegistrations.find((r) => r.status === 'scheduled');

  const scrollToBookSection = () => {
    bookSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fetchUsage = () => {
    supabase.rpc('get_mock_usage').then(({ data }) => {
      if (data) setUsage(data);
    });
  };

  const fetchMyRegistrations = () => {
    supabase
      .from('mock_registrations')
      .select('id, created_at, status, availability_notes, scheduled_at, meet_link, completed_at, technical_score, communication_score, problem_solving_score, overall_score, feedback_notes, tech_feedback')
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyRegistrations(data ?? []));
  };

  const fetchMockNotices = () => {
    supabase.rpc('get_my_mock_notices').then(({ data }) => setMockNotices(Array.isArray(data) ? data : []));
  };

  const fetchPendingRescheduleIds = () => {
    supabase.rpc('get_my_pending_reschedule_registration_ids').then(({ data }) => {
      setPendingRescheduleIds(Array.isArray(data) ? data : []);
    });
  };

  const fetchAvailableSlots = async () => {
    setSlotsLoading(true);
    const { data } = await supabase.rpc('get_available_mock_slots', {
      p_from_date: slotsFrom || null,
      p_to_date: slotsTo || null,
    });
    setAvailableSlots(Array.isArray(data) ? data : []);
    setSlotsLoading(false);
  };

  useEffect(() => {
    fetchUsage();
    fetchMyRegistrations();
    fetchMockNotices();
    fetchPendingRescheduleIds();
    setLoading(false);
  }, []);

  useEffect(() => {
    const onInvalidate = () => {
      fetchMockNotices();
      fetchMyRegistrations();
    };
    window.addEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(MESSAGES_INVALIDATE_EVENT, onInvalidate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id;
      if (!uid) return;

      unsubscribe = subscribeToAspirantMessages(
        uid,
        () => {
          fetchMockNotices();
          fetchMyRegistrations();
        },
        { channelId: `mocks-page-messages-${uid}` },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const openNoticesModal = () => {
    setNoticesModalOpen(true);
    supabase.rpc('mark_my_mock_notices_read').then(() => fetchMockNotices());
  };

  useEffect(() => {
    if (!slotsFrom || !slotsTo) return;
    fetchAvailableSlots();
  }, [slotsFrom, slotsTo]);

  const openBookConfirm = (slot) => {
    if (!requireCompleteProfile()) return;
    setConfirmBookingSlot(slot);
  };

  const handleBookSlot = async () => {
    if (!confirmBookingSlot) return;
    const slotId = confirmBookingSlot.id;
    setSlotMessage({ type: '', text: '' });
    setBookingSlotId(slotId);
    const { data } = await supabase.rpc('book_mock_slot', { p_slot_id: slotId });
    setBookingSlotId(null);
    if (data?.ok) {
      setConfirmBookingSlot(null);
      setSlotMessage({ type: 'success', text: 'Slot booked. See "My mock registrations" below for the Meet link and time.' });
      fetchUsage();
      fetchMyRegistrations();
      fetchMockNotices();
      fetchAvailableSlots();
    } else {
      setConfirmBookingSlot(null);
      setSlotMessage({ type: 'error', text: data?.error ?? 'Could not book slot.' });
    }
  };

  const handleRequestWithoutSlot = async (e) => {
    e.preventDefault();
    if (!requireCompleteProfile()) return;
    setRequestMessage({ type: '', text: '' });
    if (!requestPreferredDate || !requestPreferredTime) {
      setRequestMessage({ type: 'error', text: 'Please select date and time.' });
      return;
    }
    setRequestSaving(true);
    const dateStr = new Date(requestPreferredDate + 'T' + requestPreferredTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const parts = ['Preferred: ' + dateStr];
    if (requestNotes.trim()) parts.push(requestNotes.trim());
    const availabilityNotes = parts.join('. ');
    const { data } = await supabase.rpc('register_mock', { p_availability_notes: availabilityNotes });
    setRequestSaving(false);
    if (data?.ok) {
      setRequestMessage({ type: 'success', text: 'Request submitted. Admin will assign a slot and notify you via Messages.' });
      setRequestWithoutSlot(false);
      setRequestModalOpen(false);
      setRequestPreferredDate('');
      setRequestPreferredTime('');
      setRequestNotes('');
      fetchUsage();
      fetchMyRegistrations();
    } else {
      setRequestMessage({ type: 'error', text: data?.error ?? 'Could not submit request.' });
    }
  };

  const handleRequestReschedule = async (e) => {
    e.preventDefault();
    if (!requireCompleteProfile()) return;
    if (!rescheduleModal || !rescheduleReason.trim()) return;
    setRescheduleMessage({ type: '', text: '' });
    setRescheduleSaving(true);
    const { data } = await supabase.rpc('request_mock_reschedule', {
      p_registration_id: rescheduleModal.id,
      p_reason: rescheduleReason.trim(),
    });
    setRescheduleSaving(false);
    if (data?.ok) {
      setRescheduleModal(null);
      setRescheduleReason('');
      setRescheduleMessage({ type: '', text: '' });
      fetchMyRegistrations();
      fetchPendingRescheduleIds();
      setSlotMessage({ type: 'success', text: 'Reschedule request submitted. Admin will review and notify you via Messages.' });
    } else {
      setRescheduleMessage({ type: 'error', text: data?.error ?? 'Could not submit request.' });
    }
  };


  if (loading) {
    return <PageLoader size="md" label="Loading…" className="py-8" />;
  }

  const showRequestForm = requestWithoutSlot || requestModalOpen;
  const openRequestForm = () => {
    if (!requireCompleteProfile()) return;
    if (hasActiveMock) {
      setRequestMessage({
        type: 'error',
        text: 'You already have a mock scheduled or pending. Finish it before requesting another.',
      });
      return;
    }
    setRequestModalOpen(true);
    setRequestWithoutSlot(true);
  };
  const closeRequestForm = () => {
    setRequestModalOpen(false);
    setRequestWithoutSlot(false);
    setRequestPreferredDate('');
    setRequestPreferredTime('');
    setRequestNotes('');
    setRequestMessage({ type: '', text: '' });
  };

  return (
    <div className="space-y-6">
      {showCompleteProfileBanner ? <CompleteProfileBanner profile={aspirantProfile} /> : null}

      {(latestCancelled || unreadNoticeCount > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            {latestCancelled && !latestScheduled
              ? 'Your mock slot was cancelled or changed'
              : 'You have mock updates'}
          </p>
          <p className="mt-1 text-amber-900/90">
            {latestCancelled && !latestScheduled
              ? 'Check Messages for the reason and new time (if rescheduled). You can book another slot when ready.'
              : 'Open Messages or Notices below for reschedule/cancel details.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/dashboard/messages"
              className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              View Messages
              {unreadNoticeCount > 0 ? ` (${unreadNoticeCount})` : ''}
            </Link>
            {canBook && (
              <button
                type="button"
                onClick={scrollToBookSection}
                className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Book a new slot
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header: title, info, usage, actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Mock Interviews</h1>
          <div className="relative shrink-0" ref={infoRef}>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[rgb(var(--nth-text-muted-light))] hover:text-[hsl(var(--nth-primary))] hover:bg-[hsl(var(--nth-primary))]/10"
              aria-label="How mocks work"
            >
              <HiInformationCircle className="w-5 h-5" />
            </button>
            {infoOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[rgb(var(--nth-border-light))] bg-white p-4 shadow-lg text-left sm:w-72">
                  <p className="text-xs font-semibold text-[rgb(var(--nth-text-primary-light))] mb-2">How mocks work</p>
                  <ul className="text-xs text-[rgb(var(--nth-text-secondary-light))] space-y-1.5">
                    <li><strong>One at a time</strong> — Finish or cancel your current mock before booking another.</li>
                    <li><strong>Allowance</strong> — {usage?.limit >= 0 ? `${usage.limit} mocks per subscription month` : 'Unlimited mocks'} (scheduled + completed count).</li>
                    <li><strong>Book a slot</strong> — Pick date/time; get Meet link.</li>
                    <li><strong>Request a slot</strong> — Admin assigns; you get notified.</li>
                    <li><strong>Reschedule</strong> — Click Request reschedule; admin approves or rejects.</li>
                    <li><strong>Join</strong> — Use Meet link in My registrations.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
          {usage?.active && (
            <span className="text-sm text-[rgb(var(--nth-text-muted-light))]">
              {usage.used}{usage.limit >= 0 ? ` / ${usage.limit}` : ''} mocks this month
            </span>
          )}
          {usage?.active && withinMonthlyLimit && (
            <button
              type="button"
              onClick={openRequestForm}
              disabled={!canRequestMock && profileComplete}
              className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-center disabled:cursor-not-allowed disabled:opacity-60 ${!profileComplete ? 'rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' : 'nth-btn-primary'}`}
            >
              {!profileComplete
                ? 'Complete profile to request mock'
                : hasActiveMock
                  ? 'Mock already scheduled'
                  : 'Request for mock'}
            </button>
          )}
        </div>
      </div>

      {usage?.active && usage.period_start && usage.period_end ? (
        <section className="space-y-3">
          {mockGuidance.alerts.map((alert) => (
            <div
              key={`${alert.title}-${alert.severity}`}
              className={`rounded-xl border px-4 py-3 text-sm ${
                alert.severity === 'urgent'
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : alert.severity === 'neutral'
                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                    : 'border-indigo-200 bg-indigo-50/80 text-indigo-950'
              }`}
            >
              <p className="font-semibold">{alert.title}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">{alert.message}</p>
              {alert.bookBy ? (
                <p className="mt-2 text-xs font-semibold">
                  Book by: {formatPeriodDate(alert.bookBy)}
                  {alert.remaining > 0 ? ` · ${alert.remaining} mock${alert.remaining === 1 ? '' : 's'} left` : ''}
                </p>
              ) : null}
              {alert.nextBookAfter ? (
                <p className="mt-1 text-xs">
                  Next booking opens: {formatPeriodDate(alert.nextBookAfter)}
                </p>
              ) : null}
            </div>
          ))}

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Your mock dates</p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {mockGuidance.timeline.map((row) => (
                <li
                  key={row.key}
                  className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 ${
                    row.emphasis ? 'font-semibold text-indigo-900' : ''
                  }`}
                >
                  <span className="text-slate-600">{row.label}</span>
                  <span className="tabular-nums text-slate-900">{formatPeriodDate(row.date)}</span>
                </li>
              ))}
            </ul>
            {usage.limit >= 0 ? (
              <p className="mt-2 border-t border-indigo-100/80 pt-2 text-xs text-slate-600">
                This period: <span className="font-medium text-slate-900">{usage.used} / {usage.limit}</span>{' '}
                mocks booked or completed
                {usage.min_days_between ? (
                  <> · wait {usage.min_days_between} days between completed mocks</>
                ) : null}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Notices: compact preview + View all */}
      {mockNotices.length > 0 && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[rgb(var(--nth-text-primary-light))] flex items-center gap-2">
              <HiMegaphone className="w-4 h-4" /> Notices
              {unreadNoticeCount > 0 && (
                <span className="bg-[hsl(var(--nth-primary))] text-white text-xs font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                  {unreadNoticeCount > 99 ? '99+' : unreadNoticeCount}
                </span>
              )}
            </h2>
            {mockNotices.length > NOTICES_PREVIEW && (
              <button
                type="button"
                onClick={openNoticesModal}
                className="text-xs font-medium text-[hsl(var(--nth-primary))] hover:underline"
              >
                View all ({mockNotices.length})
              </button>
            )}
          </div>
          <div className="max-h-[180px] overflow-y-auto space-y-2">
            {mockNotices.slice(0, NOTICES_PREVIEW).map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-3 text-sm ${n.read_at ? 'border-[rgb(var(--nth-border-light))] bg-slate-50/50' : 'border-[hsl(var(--nth-primary))]/30 bg-[hsl(var(--nth-primary))]/5'}`}
              >
                <p className="text-[rgb(var(--nth-text-primary-light))] whitespace-pre-wrap line-clamp-2">{n.body}</p>
                <p className="text-xs text-[rgb(var(--nth-text-muted-light))] mt-1">{formatDateTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Request modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !requestSaving && closeRequestForm()}>
          <div className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white shadow-lg max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-2">Request for mock</h3>
            <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">Choose your preferred date and time. Admin will assign a slot and notify you.</p>
            <form onSubmit={handleRequestWithoutSlot} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">Preferred date</label>
                  <input
                    type="date"
                    value={requestPreferredDate}
                    onChange={(e) => setRequestPreferredDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-[rgb(var(--nth-border-light))] px-3 py-2 text-sm bg-white text-[rgb(var(--nth-text-primary-light))]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">Preferred time</label>
                  <input
                    type="time"
                    value={requestPreferredTime}
                    onChange={(e) => setRequestPreferredTime(e.target.value)}
                    className="w-full rounded-lg border border-[rgb(var(--nth-border-light))] px-3 py-2 text-sm bg-white text-[rgb(var(--nth-text-primary-light))]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">Additional notes (optional)</label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Free Mon–Fri 2–5 PM"
                  rows={2}
                  className="w-full rounded-lg border border-[rgb(var(--nth-border-light))] px-3 py-2 text-sm bg-white text-[rgb(var(--nth-text-primary-light))]"
                />
              </div>
              {requestMessage.text && (
                <p className={`text-sm ${requestMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{requestMessage.text}</p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeRequestForm} disabled={requestSaving} className="nth-btn-secondary w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-sm font-medium disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={requestSaving} className="nth-btn-primary w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-sm font-medium disabled:opacity-50">{requestSaving ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View all notices modal */}
      {noticesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setNoticesModalOpen(false)}>
          <div className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white shadow-lg max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--nth-border-light))]">
              <h3 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))]">All notices</h3>
              <button type="button" onClick={() => setNoticesModalOpen(false)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[rgb(var(--nth-text-muted-light))] hover:bg-slate-100 hover:text-[rgb(var(--nth-text-primary-light))]" aria-label="Close">×</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {mockNotices.map((n) => (
                <div key={n.id} className={`rounded-lg border p-3 text-sm ${n.read_at ? 'border-[rgb(var(--nth-border-light))] bg-slate-50/50' : 'border-[hsl(var(--nth-primary))]/30 bg-[hsl(var(--nth-primary))]/5'}`}>
                  <p className="text-[rgb(var(--nth-text-primary-light))] whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-[rgb(var(--nth-text-muted-light))] mt-2">{formatDateTime(n.created_at)}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[rgb(var(--nth-border-light))]">
              <Link to="/dashboard/messages" className="text-sm font-medium text-[hsl(var(--nth-primary))] hover:underline">Open Messages</Link>
            </div>
          </div>
        </div>
      )}

      {/* Book a slot */}
      {usage?.active && (
        <section ref={bookSectionRef} className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-4 sm:p-6 shadow-sm scroll-mt-4">
          <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-4">Book a slot</h2>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">From date</label>
              <input
                type="date"
                value={slotsFrom}
                onChange={(e) => setSlotsFrom(e.target.value)}
                className="rounded-lg border border-[rgb(var(--nth-border-light))] px-3 py-2 text-sm bg-white text-[rgb(var(--nth-text-primary-light))]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">To date</label>
              <input
                type="date"
                value={slotsTo}
                onChange={(e) => setSlotsTo(e.target.value)}
                className="rounded-lg border border-[rgb(var(--nth-border-light))] px-3 py-2 text-sm bg-white text-[rgb(var(--nth-text-primary-light))]"
              />
            </div>
          </div>
          {hasActiveMock ? (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You already have a mock scheduled or pending. Finish that session (or wait for it to be cancelled) before
              booking another slot.
            </p>
          ) : null}
          {slotMessage.text && (
            <p className={`text-sm mb-3 ${slotMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{slotMessage.text}</p>
          )}
          {slotsLoading ? (
            <p className="text-sm text-[rgb(var(--nth-text-muted-light))]">Loading slots…</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-[rgb(var(--nth-text-muted-light))]">No available slots in this range. Try another date range or check back later.</p>
          ) : (
            <ul className="space-y-2 max-h-[320px] overflow-y-auto">
              {availableSlots.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgb(var(--nth-border-light))] px-4 py-3 bg-slate-50/50"
                >
                  <div className="min-w-0 flex-1 text-sm text-[rgb(var(--nth-text-primary-light))] break-words">
                    <span className="font-medium">{formatDate(slot.start_at)}</span>
                    <span className="mx-2 text-[rgb(var(--nth-text-muted-light))]">·</span>
                    <span>{formatSlotTime(slot.start_at)}</span>
                    <span className="mx-2 text-[rgb(var(--nth-text-muted-light))]">·</span>
                    <span>{slot.interviewer_name ?? 'Interviewer'}</span>
                  </div>
                  {slot.booked_by_me ? (
                    <span className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg">Your slot</span>
                  ) : !profileComplete ? (
                    <button
                      type="button"
                      onClick={goToOnboarding}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Complete profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canBook || bookingSlotId !== null}
                      onClick={() => openBookConfirm(slot)}
                      className="nth-btn-primary px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingSlotId === slot.id
                        ? 'Booking…'
                        : hasActiveMock
                          ? 'Mock in progress'
                          : canBook
                            ? 'Book'
                            : 'Limit reached'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* My registrations */}
      <section>
        <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3 flex items-center gap-2">
          <HiCalendarDays className="w-5 h-5" />
          My mock registrations
        </h2>
        <div className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white overflow-hidden shadow-sm">
          <ul className="divide-y divide-[rgb(var(--nth-border-light))]">
            {myRegistrations.length === 0 ? (
              <li className="px-5 py-8 text-center text-[rgb(var(--nth-text-muted-light))] text-sm">
                No mock bookings yet. Book a slot above to get started.
              </li>
            ) : (
              myRegistrations.map((r) => {
                const joinHref = r.status === 'scheduled' ? normalizeHttpUrl(r.meet_link) : null;
                return (
                <li key={r.id} className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[rgb(var(--nth-text-primary-light))]">
                        {formatDate(r.created_at)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'requested'
                              ? 'bg-amber-100 text-amber-700'
                              : r.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-700'
                                : r.status === 'no_show'
                                  ? 'bg-red-100 text-red-700'
                                  : r.status === 'cancelled'
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status === 'completed' && <HiCheckCircle className="w-3.5 h-3.5" />}
                        {(r.status === 'scheduled' || r.status === 'requested') && <HiClock className="w-3.5 h-3.5" />}
                        {r.status === 'requested' ? 'Requested' : r.status}
                      </span>
                    </div>
                    {r.scheduled_at && (
                      <p className="mt-1 text-sm text-[rgb(var(--nth-text-secondary-light))]">
                        Scheduled: {formatDateTime(r.scheduled_at)}
                      </p>
                    )}
                    {r.status === 'cancelled' && (
                      <p className="mt-2 text-sm text-amber-800">
                        This slot was cancelled. Check{' '}
                        <Link to="/dashboard/messages" className="font-medium underline">
                          Messages
                        </Link>{' '}
                        for details.
                      </p>
                    )}
                    {r.status === 'completed' ? (
                      <div className="mt-2">
                        <MockFeedbackDisplay registration={r} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {joinHref && (
                      <a
                        href={joinHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nth-btn-primary inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                      >
                        <HiLink className="w-4 h-4" /> Join Meet
                      </a>
                    )}
                    {r.status === 'scheduled' && (
                      <button
                        type="button"
                        disabled={pendingRescheduleIds.includes(r.id)}
                        onClick={() => {
                          if (!requireCompleteProfile()) return;
                          setRescheduleModal(r);
                          setRescheduleReason('');
                          setRescheduleMessage({ type: '', text: '' });
                        }}
                        className={`px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                          !profileComplete
                            ? 'rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'nth-btn-secondary'
                        }`}
                      >
                        {!profileComplete
                          ? 'Complete profile'
                          : pendingRescheduleIds.includes(r.id)
                            ? 'Reschedule requested'
                            : 'Request reschedule'}
                      </button>
                    )}
                    {r.status === 'cancelled' && canBook && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireCompleteProfile()) return;
                          scrollToBookSection();
                        }}
                        className="nth-btn-primary px-3 py-1.5 rounded-lg text-sm font-medium"
                      >
                        Book another slot
                      </button>
                    )}
                  </div>
                </li>
              );
              })
            )}
          </ul>
        </div>
      </section>

      {/* Book slot confirmation */}
      {confirmBookingSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !bookingSlotId && setConfirmBookingSlot(null)}
        >
          <div
            className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white shadow-lg max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-slot-confirm-title"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <HiExclamationTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="book-slot-confirm-title" className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))]">
                  Confirm your slot?
                </h3>
                <p className="mt-2 text-sm text-[rgb(var(--nth-text-secondary-light))]">
                  You are booking a mock on{' '}
                  <span className="font-semibold text-[rgb(var(--nth-text-primary-light))]">
                    {formatDate(confirmBookingSlot.start_at)}
                  </span>{' '}
                  at{' '}
                  <span className="font-semibold text-[rgb(var(--nth-text-primary-light))]">
                    {formatSlotTime(confirmBookingSlot.start_at)}
                  </span>{' '}
                  with{' '}
                  <span className="font-semibold text-[rgb(var(--nth-text-primary-light))]">
                    {confirmBookingSlot.interviewer_name ?? 'your interviewer'}
                  </span>
                  .
                </p>
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                  <p className="font-semibold">Please be available at the scheduled time.</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                    Your interviewer will join the mock at sharp time. Late joins or no-shows may count against your mock
                    allowance. Only book if you are sure you can attend on time.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmBookingSlot(null)}
                disabled={bookingSlotId !== null}
                className="nth-btn-secondary w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBookSlot}
                disabled={bookingSlotId !== null}
                className="nth-btn-primary w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:transform-none"
              >
                {bookingSlotId ? 'Booking…' : 'Yes, I will be available'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request reschedule modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !rescheduleSaving && setRescheduleModal(null)}>
          <div className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white shadow-lg max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-2">Request reschedule</h3>
            <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">
              You can’t change the time yourself. Admin will review your request and, if approved, reschedule your mock and notify you.
            </p>
            <form onSubmit={handleRequestReschedule} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">Reason (required)</label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Conflict with another commitment"
                  rows={3}
                  className="w-full rounded-lg border border-[rgb(var(--nth-border-light))] px-3 py-2 text-sm bg-white text-[rgb(var(--nth-text-primary-light))]"
                  required
                />
              </div>
              {rescheduleMessage.text && (
                <p className={`text-sm ${rescheduleMessage.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{rescheduleMessage.text}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setRescheduleModal(null); setRescheduleReason(''); setRescheduleMessage({ type: '', text: '' }); }} disabled={rescheduleSaving} className="nth-btn-secondary px-3 py-2 text-sm font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={rescheduleSaving || !rescheduleReason.trim()} className="nth-btn-primary px-3 py-2 text-sm font-medium disabled:opacity-50">
                  {rescheduleSaving ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
