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

export default function MocksPage() {
  const [usage, setUsage] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [mockNotices, setMockNotices] = useState([]);
  const [availability, setAvailability] = useState('');
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  const canRegister = usage?.active && (usage.limit < 0 || usage.used < usage.limit);

  const fetchUsage = () => {
    supabase.rpc('get_mock_usage').then(({ data }) => {
      if (data) setUsage(data);
    });
  };

  const fetchMyRegistrations = () => {
    supabase
      .from('mock_registrations')
      .select('id, created_at, status, availability_notes, scheduled_at, meet_link, completed_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyRegistrations(data ?? []));
  };

  const fetchMockNotices = () => {
    supabase.rpc('get_my_mock_notices').then(({ data }) => setMockNotices(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchUsage();
    fetchMyRegistrations();
    fetchMockNotices();
    setLoading(false);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!canRegister || registering) return;
    setRegistering(true);
    const { data } = await supabase.rpc('register_mock', {
      p_availability_notes: availability.trim() || null,
    });
    setRegistering(false);
    if (data?.ok) {
      setMessage({ type: 'success', text: 'Request sent. We’ll set a time and send you the Meet link here and in Messages. Check this page or Messages so you don’t miss it.' });
      setAvailability('');
      fetchUsage();
      fetchMyRegistrations();
      fetchMockNotices();
    } else {
      setMessage({ type: 'error', text: data?.error ?? 'Could not register.' });
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
          <HiAcademicCap className="w-5 h-5 text-[rgb(var(--nth-primary))]" />
          How it works
        </h2>
        <ol className="space-y-3 text-[rgb(var(--nth-text-secondary-light))] text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--nth-primary))]/10 text-[rgb(var(--nth-primary))] font-semibold text-xs">1</span>
            <span><strong className="text-[rgb(var(--nth-text-primary-light))]">Apply for a mock</strong> — Register using your plan slot. You can register for mocks within your plan limit.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--nth-primary))]/10 text-[rgb(var(--nth-primary))] font-semibold text-xs">2</span>
            <span><strong className="text-[rgb(var(--nth-text-primary-light))]">Share your availability</strong> — Tell us when you’re free. We’ll schedule and send you the date, time, and Meet link here and in Messages.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--nth-primary))]/10 text-[rgb(var(--nth-primary))] font-semibold text-xs">3</span>
            <span><strong className="text-[rgb(var(--nth-text-primary-light))]">Join and complete</strong> — Check this page or Messages for the Meet link. If you miss the slot, we may mark it no-show and you can request again.</span>
          </li>
        </ol>
      </section>

      {/* Mock notices (same as in Messages – schedule/completed updates) */}
      {mockNotices.length > 0 && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3 flex items-center gap-2">
            <HiMegaphone className="w-5 h-5 text-[rgb(var(--nth-primary))]" />
            Mock updates & notices
          </h2>
          <p className="text-sm text-[rgb(var(--nth-text-secondary-light))] mb-4">
            When your mock is scheduled, the date and Meet link appear here and in Messages. Open the dashboard or Messages to get the link before your slot.
          </p>
          <ul className="space-y-3">
            {mockNotices.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-4 ${n.read_at ? 'border-[rgb(var(--nth-border-light))] bg-slate-50/50' : 'border-[rgb(var(--nth-primary))]/30 bg-[rgb(var(--nth-primary))]/5'}`}
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
          Mocks this period: <span className="font-medium text-[rgb(var(--nth-text-primary-light))]">{usage.used}</span>
          {usage.limit >= 0 && <> of {usage.limit}</>}
        </p>
      )}

      {/* Register form */}
      {usage?.active && (
        <section className="rounded-xl border border-[rgb(var(--nth-border-light))] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[rgb(var(--nth-text-primary-light))] mb-3">Register for a mock</h2>
          <form onSubmit={handleRegister} className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="availability" className="block text-sm font-medium text-[rgb(var(--nth-text-secondary-light))] mb-1">
                Your availability (e.g. Mon–Fri 2–5 PM, weekends 10 AM–1 PM)
              </label>
              <textarea
                id="availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                rows={3}
                placeholder="When are you available for the mock interview?"
                className="w-full px-3 py-2 border border-[rgb(var(--nth-border-light))] rounded-lg bg-white text-[rgb(var(--nth-text-primary-light))] placeholder-[rgb(var(--nth-text-muted-light))]"
              />
            </div>
            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{message.text}</p>
            )}
            <button
              type="submit"
              disabled={!canRegister || registering}
              className="nth-btn-primary px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {registering ? 'Registering…' : canRegister ? 'Register for a mock' : 'Mock limit reached'}
            </button>
          </form>
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
                No mock registrations yet. Register above to get started.
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
                                  : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status === 'completed' && <HiCheckCircle className="w-3.5 h-3.5" />}
                        {(r.status === 'scheduled' || r.status === 'requested') && <HiClock className="w-3.5 h-3.5" />}
                        {r.status === 'requested' ? 'Requested' : r.status}
                      </span>
                    </div>
                    {r.status === 'requested' && (
                      <p className="mt-1 text-sm text-[rgb(var(--nth-text-muted-light))]">
                        Check Mock updates above and Messages for your schedule and Meet link when we set it.
                      </p>
                    )}
                    {r.scheduled_at && (
                      <p className="mt-1 text-sm text-[rgb(var(--nth-text-secondary-light))]">
                        Scheduled: {formatDateTime(r.scheduled_at)}
                      </p>
                    )}
                    {r.availability_notes && (
                      <p className="mt-0.5 text-sm text-[rgb(var(--nth-text-muted-light))]">
                        Availability: {r.availability_notes}
                      </p>
                    )}
                  </div>
                  {r.status === 'scheduled' && r.meet_link && (
                    <a
                      href={r.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgb(var(--nth-primary))] text-white text-sm font-medium hover:opacity-90 shrink-0"
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
