import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { normalizeHttpUrl, isAspirantProfileComplete } from '../../../lib/aspirantProfile';
import { isSubscriptionActive } from '../../../lib/planLimits';
import { getMockBookingGuidance } from '../../../lib/mockBookingGuidance';
import { useAppSelector } from '../../../store/hooks';
import { useProfileOnboardingGate } from '../hooks/useProfileOnboardingGate';
import { useAspirantMessageUnread } from '../../../hooks/useAspirantMessageUnread';
import { PageLoader } from '../../../components/ui/Loader';
import MockFeedbackDisplay from '../../../components/mock/MockFeedbackDisplay';
import CompleteProfileBanner from '../components/CompleteProfileBanner';
import { subscribeToAspirantMessages } from '../../../lib/messageRealtime';
import { MESSAGES_INVALIDATE_EVENT } from '../../../lib/messagesEvents';
import {
  HiCalendarDays,
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiChevronDown,
  HiClock,
  HiExclamationTriangle,
  HiInformationCircle,
  HiLink,
  HiSparkles,
} from 'react-icons/hi2';

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
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState(null);
  const infoRef = useRef(null);
  const bookSectionRef = useRef(null);

  const { unreadTotal: messagesUnread } = useAspirantMessageUnread();

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

  const placementReady =
    aspirantProfile?.placement_pipeline_status === 'ready' &&
    aspirantProfile?.profile_status !== 'inactive';

  const primaryAlert = mockGuidance.alerts[0] ?? null;

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
    fetchPendingRescheduleIds();
    setLoading(false);
  }, []);

  useEffect(() => {
    const onInvalidate = () => {
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
      setSlotMessage({ type: 'success', text: 'Slot booked. See My mocks above for the Meet link and time.' });
      fetchUsage();
      fetchMyRegistrations();
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
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5 lg:max-w-5xl xl:max-w-6xl">
      {showCompleteProfileBanner ? <CompleteProfileBanner profile={aspirantProfile} /> : null}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-bold text-[rgb(var(--nth-text-primary-light))] sm:text-2xl">Mock Interviews</h1>
          <div className="relative shrink-0" ref={infoRef}>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-[rgb(var(--nth-text-muted-light))] hover:bg-[hsl(var(--nth-primary))]/10 hover:text-[hsl(var(--nth-primary))]"
              aria-label="How mocks work"
            >
              <HiInformationCircle className="h-5 w-5" />
            </button>
            {infoOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[rgb(var(--nth-border-light))] bg-white p-4 text-left shadow-lg sm:w-72">
                  <p className="mb-2 text-xs font-semibold text-[rgb(var(--nth-text-primary-light))]">How mocks work</p>
                  <ul className="space-y-1.5 text-xs text-[rgb(var(--nth-text-secondary-light))]">
                    <li><strong>One at a time</strong> — Finish or cancel your current mock before booking another.</li>
                    <li><strong>Allowance</strong> — {usage?.limit >= 0 ? `${usage.limit} mocks per subscription month` : 'Unlimited mocks'} (scheduled + completed count).</li>
                    <li><strong>Book a slot</strong> — Pick date/time; get Meet link.</li>
                    <li><strong>Request a slot</strong> — Admin assigns; you get notified via Messages.</li>
                    <li><strong>Reschedule</strong> — Request reschedule; admin approves or rejects.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {usage?.active && usage.limit >= 0 ? (
            <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold tabular-nums text-slate-800">
              {usage.used} / {usage.limit} mocks
            </span>
          ) : null}
          {usage?.active && withinMonthlyLimit ? (
            <button
              type="button"
              onClick={openRequestForm}
              disabled={!canRequestMock && profileComplete}
              className={`w-full px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${!profileComplete ? 'rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' : 'nth-btn-primary'}`}
            >
              {!profileComplete
                ? 'Complete profile to request mock'
                : hasActiveMock
                  ? 'Mock already scheduled'
                  : 'Request for mock'}
            </button>
          ) : null}
        </div>
      </div>

      {(messagesUnread > 0 || placementReady) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {messagesUnread > 0 ? (
            <Link
              to="/dashboard/messages"
              className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-950 hover:bg-indigo-100 lg:min-h-0"
            >
              <span className="flex items-center gap-2">
                <HiChatBubbleLeftRight className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
                {messagesUnread} unread message{messagesUnread === 1 ? '' : 's'}
              </span>
              <span className="text-indigo-700">Open →</span>
            </Link>
          ) : null}

          {placementReady ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 lg:items-center">
              <HiSparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 lg:mt-0" aria-hidden />
              <p>
                <span className="font-semibold">Placement-ready.</span>{' '}
                Our team will reach out with suitable opportunities.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {usage?.active && usage.period_start && usage.period_end ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {primaryAlert ? (
            <div
              className={`border-b px-4 py-3 text-sm ${
                primaryAlert.severity === 'urgent'
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : primaryAlert.severity === 'neutral'
                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                    : 'border-indigo-100 bg-indigo-50 text-indigo-950'
              }`}
            >
              <p className="font-semibold">{primaryAlert.title}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90 lg:text-sm">{primaryAlert.message}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium lg:gap-x-4">
                {primaryAlert.bookBy ? (
                  <span>Book by {formatPeriodDate(primaryAlert.bookBy)}</span>
                ) : null}
                {primaryAlert.remaining > 0 ? (
                  <span>{primaryAlert.remaining} mock{primaryAlert.remaining === 1 ? '' : 's'} left</span>
                ) : null}
                {primaryAlert.nextBookAfter ? (
                  <span>Next booking {formatPeriodDate(primaryAlert.nextBookAfter)}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-5 lg:gap-3">
            {mockGuidance.timeline.map((row) => (
              <div
                key={row.key}
                className={`rounded-lg border px-3 py-2.5 ${
                  row.emphasis
                    ? 'border-indigo-200 bg-indigo-50/80'
                    : 'border-slate-100 bg-slate-50/80'
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{row.label}</p>
                <p className={`mt-0.5 text-sm tabular-nums ${row.emphasis ? 'font-bold text-indigo-900' : 'font-semibold text-slate-900'}`}>
                  {formatPeriodDate(row.date)}
                </p>
              </div>
            ))}
          </div>

          {usage.limit >= 0 ? (
            <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
              {usage.used} / {usage.limit} mocks this period
              {usage.min_days_between ? ` · ${usage.min_days_between}-day gap after each completed mock` : ''}
            </p>
          ) : null}
        </section>
      ) : null}

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

      <div className="space-y-4 sm:space-y-5 xl:grid xl:grid-cols-5 xl:items-start xl:gap-6 xl:space-y-0">
      {/* My registrations */}
      <section className={usage?.active ? 'xl:col-span-3' : 'xl:col-span-full'}>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[rgb(var(--nth-text-primary-light))] sm:text-lg">
          <HiCalendarDays className="h-5 w-5" />
          My mocks
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[rgb(var(--nth-border-light))] bg-white shadow-sm">
          <ul className="divide-y divide-[rgb(var(--nth-border-light))]">
            {myRegistrations.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[rgb(var(--nth-text-muted-light))] sm:px-5">
                No mock bookings yet. Book a slot below when you are ready.
              </li>
            ) : (
              myRegistrations.map((r) => {
                const joinHref = r.status === 'scheduled' ? normalizeHttpUrl(r.meet_link) : null;
                const feedbackOpen = expandedFeedbackId === r.id;
                return (
                <li key={r.id} className="px-4 py-4 sm:px-5 lg:px-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[rgb(var(--nth-text-primary-light))]">
                        {r.scheduled_at ? formatDateTime(r.scheduled_at) : formatDate(r.created_at)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                        {r.status === 'completed' && <HiCheckCircle className="h-3.5 w-3.5" />}
                        {(r.status === 'scheduled' || r.status === 'requested') && <HiClock className="h-3.5 w-3.5" />}
                        {r.status === 'requested' ? 'Requested' : r.status}
                      </span>
                    </div>

                    {r.status === 'cancelled' ? (
                      <p className="text-sm text-amber-800">
                        This slot was cancelled. Check{' '}
                        <Link to="/dashboard/messages" className="font-medium underline">
                          Messages
                        </Link>{' '}
                        for details.
                      </p>
                    ) : null}

                    {r.status === 'completed' ? (
                      <div>
                        {feedbackOpen ? (
                          <div className="space-y-2">
                            <MockFeedbackDisplay registration={r} />
                            <button
                              type="button"
                              onClick={() => setExpandedFeedbackId(null)}
                              className="text-xs font-semibold text-indigo-700 hover:underline"
                            >
                              Hide feedback
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExpandedFeedbackId(r.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-left text-sm hover:bg-emerald-50"
                          >
                            <MockFeedbackDisplay registration={r} compact />
                            <HiChevronDown className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                          </button>
                        )}
                      </div>
                    ) : null}
                    </div>

                    <div className="flex flex-col gap-2 lg:shrink-0 lg:min-w-[11rem] lg:items-stretch">
                      {joinHref ? (
                        <a
                          href={joinHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nth-btn-primary inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold lg:w-full"
                        >
                          <HiLink className="h-4 w-4" /> Join Meet
                        </a>
                      ) : null}
                      {r.status === 'scheduled' ? (
                        <button
                          type="button"
                          disabled={pendingRescheduleIds.includes(r.id)}
                          onClick={() => {
                            if (!requireCompleteProfile()) return;
                            setRescheduleModal(r);
                            setRescheduleReason('');
                            setRescheduleMessage({ type: '', text: '' });
                          }}
                          className={`w-full px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 lg:w-full ${
                            !profileComplete
                              ? 'rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                              : 'nth-btn-secondary'
                          }`}
                        >
                          {!profileComplete
                            ? 'Complete profile'
                            : pendingRescheduleIds.includes(r.id)
                              ? 'Reschedule requested'
                              : 'Request reschedule'}
                        </button>
                      ) : null}
                      {r.status === 'cancelled' && canBook ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!requireCompleteProfile()) return;
                            scrollToBookSection();
                          }}
                          className="nth-btn-primary w-full rounded-xl px-4 py-2.5 text-sm font-semibold lg:w-full"
                        >
                          Book another slot
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
              })
            )}
          </ul>
        </div>
      </section>

      {/* Book a slot */}
      {usage?.active && (
        <section ref={bookSectionRef} className="scroll-mt-4 overflow-hidden rounded-2xl border border-[rgb(var(--nth-border-light))] bg-white p-4 shadow-sm sm:p-5 xl:col-span-2 xl:sticky xl:top-4">
          <h2 className="mb-4 text-base font-semibold text-[rgb(var(--nth-text-primary-light))] sm:text-lg">Book a slot</h2>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-none">
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgb(var(--nth-text-muted-light))]">From date</label>
              <input
                type="date"
                value={slotsFrom}
                onChange={(e) => setSlotsFrom(e.target.value)}
                className="w-full rounded-lg border border-[rgb(var(--nth-border-light))] bg-white px-3 py-2.5 text-sm text-[rgb(var(--nth-text-primary-light))]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[rgb(var(--nth-text-muted-light))]">To date</label>
              <input
                type="date"
                value={slotsTo}
                onChange={(e) => setSlotsTo(e.target.value)}
                className="w-full rounded-lg border border-[rgb(var(--nth-border-light))] bg-white px-3 py-2.5 text-sm text-[rgb(var(--nth-text-primary-light))]"
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
                  className="flex flex-col gap-3 rounded-xl border border-[rgb(var(--nth-border-light))] bg-slate-50/50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1 text-sm text-[rgb(var(--nth-text-primary-light))]">
                    <p className="font-semibold">{formatDate(slot.start_at)}</p>
                    <p className="mt-0.5 text-[rgb(var(--nth-text-secondary-light))]">
                      {formatSlotTime(slot.start_at)} · {slot.interviewer_name ?? 'Interviewer'}
                    </p>
                  </div>
                  {slot.booked_by_me ? (
                    <span className="w-full shrink-0 rounded-lg bg-emerald-100 px-3 py-2 text-center text-sm font-medium text-emerald-700 lg:w-auto lg:min-w-[5.5rem]">Your slot</span>
                  ) : !profileComplete ? (
                    <button
                      type="button"
                      onClick={goToOnboarding}
                      className="w-full shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 lg:w-auto"
                    >
                      Complete profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canBook || bookingSlotId !== null}
                      onClick={() => openBookConfirm(slot)}
                      className="nth-btn-primary w-full shrink-0 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:min-w-[5.5rem]"
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

      </div>

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
