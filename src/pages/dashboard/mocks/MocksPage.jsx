import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { normalizeHttpUrl, isAspirantProfileComplete } from '../../../lib/aspirantProfile';
import { isSubscriptionActive } from '../../../lib/planLimits';
import { useAppSelector } from '../../../store/hooks';
import { useProfileOnboardingGate } from '../hooks/useProfileOnboardingGate';
import { PageLoader } from '../../../components/ui/Loader';
import MockFeedbackDisplay from '../../../components/mock/MockFeedbackDisplay';
import CompleteProfileBanner from '../components/CompleteProfileBanner';
import { HiCalendarDays, HiCheckCircle, HiClock, HiInformationCircle, HiLink, HiMegaphone } from 'react-icons/hi2';

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

  const withinMonthlyLimit = usage?.active && (usage.limit < 0 || usage.used < usage.limit);
  const pastBookingGap =
    !usage?.next_book_after || new Date(usage.next_book_after) <= new Date();
  const canBook = withinMonthlyLimit && pastBookingGap;
  const NOTICES_PREVIEW = 5;

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
    if (!slotsFrom || !slotsTo) return;
    fetchAvailableSlots();
  }, [slotsFrom, slotsTo]);

  const handleBookSlot = async (slotId) => {
    if (!requireCompleteProfile()) return;
    setSlotMessage({ type: '', text: '' });
    setBookingSlotId(slotId);
    const { data } = await supabase.rpc('book_mock_slot', { p_slot_id: slotId });
    setBookingSlotId(null);
    if (data?.ok) {
      setSlotMessage({ type: 'success', text: 'Slot booked. See "My mock registrations" below for the Meet link and time.' });
      fetchUsage();
      fetchMyRegistrations();
      fetchMockNotices();
      fetchAvailableSlots();
    } else {
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
      {showCompleteProfileBanner ? <CompleteProfileBanner /> : null}

      {/* Header: title, info, usage, actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Mock Interviews</h1>
          <div className="relative" ref={infoRef}>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              className="p-1 rounded-full text-[rgb(var(--nth-text-muted-light))] hover:text-[hsl(var(--nth-primary))] hover:bg-[hsl(var(--nth-primary))]/10"
              aria-label="How mocks work"
            >
              <HiInformationCircle className="w-5 h-5" />
            </button>
            {infoOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-[rgb(var(--nth-border-light))] bg-white p-4 shadow-lg text-left">
                  <p className="text-xs font-semibold text-[rgb(var(--nth-text-primary-light))] mb-2">How mocks work</p>
                  <ul className="text-xs text-[rgb(var(--nth-text-secondary-light))] space-y-1.5">
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
        <div className="flex items-center gap-3">
          {usage?.active && (
            <span className="text-sm text-[rgb(var(--nth-text-muted-light))]">
              {usage.used}{usage.limit >= 0 ? ` / ${usage.limit}` : ''} mocks this month
            </span>
          )}
          {usage?.active && withinMonthlyLimit && (
            <button
              type="button"
              onClick={openRequestForm}
              className={`px-4 py-2 text-sm font-medium ${!profileComplete ? 'rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' : 'nth-btn-primary'}`}
            >
              {!profileComplete ? 'Complete profile to request mock' : 'Request for mock'}
            </button>
          )}
        </div>
      </div>

      {usage?.active && usage.period_start && usage.period_end ? (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">This subscription month:</span>{' '}
            {formatPeriodDate(usage.period_start)} – {formatPeriodDate(usage.period_end)}
            {usage.limit >= 0 ? (
              <>
                {' '}
                · <span className="font-medium">{usage.used} / {usage.limit}</span> mocks booked or completed
              </>
            ) : null}
          </p>
          {usage.next_book_after ? (
            <p className="mt-1 text-xs text-slate-600">
              You can book your next mock from{' '}
              <span className="font-medium">{formatPeriodDate(usage.next_book_after)}</span>
              {usage.min_days_between ? ` (${usage.min_days_between}-day gap after your last completed mock).` : '.'}
            </p>
          ) : usage.min_days_between ? (
            <p className="mt-1 text-xs text-slate-600">
              Up to {usage.limit >= 0 ? usage.limit : 'unlimited'} mocks per subscription month; wait at least{' '}
              {usage.min_days_between} days between completed mocks.
            </p>
          ) : null}
          {!withinMonthlyLimit && usage.limit >= 0 ? (
            <p className="mt-1 text-xs text-amber-800">
              Monthly allowance used. Your next month starts {formatPeriodDate(usage.period_end)}.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Notices: compact preview + View all */}
      {mockNotices.length > 0 && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[rgb(var(--nth-text-primary-light))] flex items-center gap-2">
              <HiMegaphone className="w-4 h-4" /> Notices
            </h2>
            {mockNotices.length > NOTICES_PREVIEW && (
              <button
                type="button"
                onClick={() => setNoticesModalOpen(true)}
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
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeRequestForm} disabled={requestSaving} className="nth-btn-secondary px-3 py-2 text-sm font-medium disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={requestSaving} className="nth-btn-primary px-3 py-2 text-sm font-medium disabled:opacity-50">{requestSaving ? 'Submitting…' : 'Submit'}</button>
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
              <button type="button" onClick={() => setNoticesModalOpen(false)} className="text-[rgb(var(--nth-text-muted-light))] hover:text-[rgb(var(--nth-text-primary-light))]">×</button>
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
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
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
                  <div className="text-sm text-[rgb(var(--nth-text-primary-light))]">
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
                      onClick={() => handleBookSlot(slot.id)}
                      className="nth-btn-primary px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingSlotId === slot.id ? 'Booking…' : canBook ? 'Book' : 'Limit reached'}
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
                  </div>
                </li>
              );
              })
            )}
          </ul>
        </div>
      </section>

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
