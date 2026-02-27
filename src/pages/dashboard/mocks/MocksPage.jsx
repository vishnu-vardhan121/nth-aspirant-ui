import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { PageLoader } from '../../../components/ui/Loader';
import { HiAcademicCap, HiCalendarDays, HiCheckCircle, HiClock, HiMegaphone, HiLink } from 'react-icons/hi2';

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

export default function MocksPage() {
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
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestMessage, setRequestMessage] = useState({ type: '', text: '' });

  const canBook = usage?.active && (usage.limit < 0 || usage.used < usage.limit);

  const fetchUsage = () => {
    supabase.rpc('get_mock_usage').then(({ data }) => {
      if (data) setUsage(data);
    });
  };

  const fetchMyRegistrations = () => {
    supabase
      .from('mock_registrations')
      .select('id, created_at, status, availability_notes, scheduled_at, meet_link, completed_at, technical_score, communication_score, problem_solving_score, overall_score, feedback_notes')
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyRegistrations(data ?? []));
  };

  const fetchMockNotices = () => {
    supabase.rpc('get_my_mock_notices').then(({ data }) => setMockNotices(Array.isArray(data) ? data : []));
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
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!slotsFrom || !slotsTo) return;
    fetchAvailableSlots();
  }, [slotsFrom, slotsTo]);

  const handleBookSlot = async (slotId) => {
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
    setRequestMessage({ type: '', text: '' });
    setRequestSaving(true);
    const { data } = await supabase.rpc('register_mock', { p_availability_notes: requestNotes.trim() || null });
    setRequestSaving(false);
    if (data?.ok) {
      setRequestMessage({ type: 'success', text: 'Request submitted. Admin may assign a slot and notify you via Messages.' });
      setRequestWithoutSlot(false);
      setRequestNotes('');
      fetchUsage();
      fetchMyRegistrations();
    } else {
      setRequestMessage({ type: 'error', text: data?.error ?? 'Could not submit request.' });
    }
  };


  if (loading) {
    return <PageLoader size="md" label="Loading…" className="py-8" />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[rgb(var(--nth-text-primary-light))]">Mock Interviews</h1>

      {/* Process explanation */}
      <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3 flex items-center gap-2">
          <HiAcademicCap className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
          How it works
        </h2>
        <ol className="space-y-3 text-[rgb(var(--nth-text-secondary-light))] text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--nth-primary))]/10 text-[hsl(var(--nth-primary))] font-semibold text-xs">1</span>
            <span><strong className="text-[rgb(var(--nth-text-primary-light))]">Book a slot</strong> — Choose an available date and time below. You can book mocks within your plan limit.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--nth-primary))]/10 text-[hsl(var(--nth-primary))] font-semibold text-xs">2</span>
            <span><strong className="text-[rgb(var(--nth-text-primary-light))]">Join at your time</strong> — Use the Meet link in My mock registrations to join the interview. You’ll get the link as soon as you book.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--nth-primary))]/10 text-[hsl(var(--nth-primary))] font-semibold text-xs">3</span>
            <span><strong className="text-[rgb(var(--nth-text-primary-light))]">Get feedback</strong> — After the mock, your interviewer will submit scores and notes. View them here once the mock is marked completed.</span>
          </li>
        </ol>
      </section>

      {/* Mock notices (reschedule/cancel messages from admin or interviewer) */}
      {mockNotices.length > 0 && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3 flex items-center gap-2">
            <HiMegaphone className="w-5 h-5 text-[hsl(var(--nth-primary))]" />
            Mock updates & notices
          </h2>
          <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">
            Reschedule or cancellation notices appear here and in Messages. Check before your slot.
          </p>
          <ul className="space-y-3">
            {mockNotices.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-4 ${n.read_at ? 'border-[rgb(var(--nth-border-light))] bg-slate-50/50' : 'border-[hsl(var(--nth-primary))]/30 bg-[hsl(var(--nth-primary))]/5'}`}
              >
                <p className="text-sm text-[rgb(var(--nth-text-primary-light))] whitespace-pre-wrap">{n.body}</p>
                <p className="text-xs text-[rgb(var(--nth-text-muted-light))] mt-2">{formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Usage */}
      {usage?.active && (
        <p className="text-sm text-[rgb(var(--nth-text-secondary-light))]">
          Mocks completed this period: <span className="font-medium text-[rgb(var(--nth-text-primary-light))]">{usage.used}</span>
          {usage.limit >= 0 && <> of {usage.limit}</>}
        </p>
      )}

      {/* Request without slot (backward compatibility) */}
      {usage?.active && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3">Request without choosing a slot</h2>
          <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">
            If you prefer not to pick a slot, you can submit a request with your availability notes. Admin may assign a slot and notify you.
          </p>
          {!requestWithoutSlot ? (
            <button
              type="button"
              onClick={() => setRequestWithoutSlot(true)}
              className="nth-btn-secondary px-3 py-2 text-sm font-medium"
            >
              Request mock (no slot)
            </button>
          ) : (
            <form onSubmit={handleRequestWithoutSlot} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--nth-text-muted-light))] mb-1">Availability notes (optional)</label>
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
              <div className="flex gap-2">
                <button type="submit" disabled={requestSaving} className="nth-btn-primary px-3 py-2 text-sm font-medium disabled:opacity-50">
                  {requestSaving ? 'Submitting…' : 'Submit request'}
                </button>
                <button type="button" onClick={() => { setRequestWithoutSlot(false); setRequestNotes(''); setRequestMessage({ type: '', text: '' }); }} className="nth-btn-secondary px-3 py-2 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Book a slot */}
      {usage?.active && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3">Book a slot</h2>
          <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">
            Pick an available slot (date, time, interviewer). After booking, the Meet link and time appear in My mock registrations below.
          </p>
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
                  <button
                    type="button"
                    disabled={!canBook || bookingSlotId !== null}
                    onClick={() => handleBookSlot(slot.id)}
                    className="nth-btn-primary px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingSlotId === slot.id ? 'Booking…' : canBook ? 'Book' : 'Limit reached'}
                  </button>
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
              myRegistrations.map((r) => (
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
                    {r.status === 'completed' && [r.technical_score, r.communication_score, r.problem_solving_score, r.overall_score].every((n) => n != null) && (
                      <p className="mt-1 text-sm text-[rgb(var(--nth-text-secondary-light))]">
                        Scores: T: {r.technical_score} · C: {r.communication_score} · P: {r.problem_solving_score} · O: {r.overall_score}
                        {r.feedback_notes && (
                          <span className="block mt-0.5 text-[rgb(var(--nth-text-muted-light))]">{r.feedback_notes}</span>
                        )}
                      </p>
                    )}
                  </div>
                  {r.status === 'scheduled' && r.meet_link && (
                    <a
                      href={r.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--nth-primary))] text-white text-sm font-medium hover:opacity-90 shrink-0"
                    >
                      <HiLink className="w-4 h-4" /> Join Meet
                    </a>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
