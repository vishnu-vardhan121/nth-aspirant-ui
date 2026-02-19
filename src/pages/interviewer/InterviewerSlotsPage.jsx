import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui/Loader';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function InterviewerSlotsPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const loadSlots = () => {
    setLoading(true);
    supabase
      .rpc('get_interviewer_mock_slots', { p_from: fromDate || null, p_to: toDate || null })
      .then(({ data }) => {
        setSlots(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSlots();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Slots</h1>
      <p className="text-sm text-slate-600">
        Slots you are assigned. Booked slots show the aspirant (student) who booked; available slots are open for
        booking.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          To
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={loadSlots}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader size="md" label="Loading slots…" className="py-8" />
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No slots in this date range. Admin creates slots for you; check back later.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Aspirant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {slots.map((s) => (
                <tr key={s.id} className="bg-white">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {formatDateTime(s.start_at)} – {formatDateTime(s.end_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === 'booked' ? 'bg-green-100 text-green-800' : s.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {s.aspirant_name ? (
                      <>
                        {s.aspirant_name}
                        {s.aspirant_email && <span className="block text-xs text-slate-500">{s.aspirant_email}</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {s.meet_link ? (
                      <a href={s.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        Join
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
