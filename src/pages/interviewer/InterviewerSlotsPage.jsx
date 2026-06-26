import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { supabase } from '../../lib/supabase';
import { PageLoader, ButtonLoader } from '../../components/ui/Loader';
import { HiPlus } from 'react-icons/hi2';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function InterviewerSlotsPage() {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    date: '',
    startTime: '10:00',
    numSlots: 4,
    durationPreset: '25',
    durationCustom: 25,
    meetLink: '',
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ start: '', end: '' });
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [cancelSlot, setCancelSlot] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);
  const [flash, setFlash] = useState({ type: '', text: '' });

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash({ type: '', text: '' }), 4000);
  };

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

  const openReschedule = (s) => {
    setRescheduleSlot(s);
    const start = new Date(s.start_at);
    const end = new Date(s.end_at);
    setRescheduleForm({
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
    });
  };

  const handleCreateSlots = async (e) => {
    e.preventDefault();
    if (!userId) {
      showFlash('error', 'Not signed in.');
      return;
    }
    if (!createForm.date || !createForm.startTime || !createForm.numSlots || createForm.numSlots < 1) {
      showFlash('error', 'Enter date, start time, and number of slots.');
      return;
    }
    const durationMins =
      createForm.durationPreset === 'custom'
        ? Math.min(60, Math.max(15, Number(createForm.durationCustom) || 25))
        : Number(createForm.durationPreset);
    const startAt = new Date(`${createForm.date}T${createForm.startTime}:00`);
    const endAt = new Date(startAt.getTime() + createForm.numSlots * durationMins * 60 * 1000);
    setCreateSaving(true);
    const { data } = await supabase.rpc('create_mock_slots', {
      p_interviewer_id: userId,
      p_start_at: startAt.toISOString(),
      p_end_at: endAt.toISOString(),
      p_slot_duration_mins: durationMins,
      p_meet_link: createForm.meetLink?.trim() || null,
    });
    setCreateSaving(false);
    if (data?.ok) {
      setCreateOpen(false);
      setCreateForm((f) => ({ ...f, date: '', meetLink: '' }));
      showFlash('success', 'Availability published. Students can book these slots.');
      loadSlots();
    } else {
      showFlash('error', data?.error ?? 'Failed to create slots.');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleSlot) return;
    const startAt = new Date(rescheduleForm.start);
    const endAt = new Date(rescheduleForm.end);
    if (endAt <= startAt) {
      showFlash('error', 'End time must be after start time.');
      return;
    }
    setRescheduleSaving(true);
    const { data } = await supabase.rpc('reschedule_mock_slot', {
      p_slot_id: rescheduleSlot.id,
      p_new_start_at: startAt.toISOString(),
      p_new_end_at: endAt.toISOString(),
    });
    setRescheduleSaving(false);
    if (data?.ok) {
      setRescheduleSlot(null);
      showFlash('success', 'Slot rescheduled. Aspirant will be notified.');
      loadSlots();
    } else {
      showFlash('error', data?.error ?? 'Failed to reschedule.');
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelSlot) return;
    setCancelSaving(true);
    const { data } = await supabase.rpc('cancel_mock_slot', {
      p_slot_id: cancelSlot.id,
      p_reason: cancelReason.trim() || null,
    });
    setCancelSaving(false);
    if (data?.ok) {
      setCancelSlot(null);
      setCancelReason('');
      showFlash('success', 'Slot cancelled. Aspirant will be notified.');
      loadSlots();
    } else {
      showFlash('error', data?.error ?? 'Failed to cancel.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My availability</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Add time when you are free for mocks. Students book open slots from their dashboard — no need to
            wait for admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shrink-0"
        >
          <HiPlus className="h-5 w-5" aria-hidden />
          Add availability
        </button>
      </div>

      {flash.text && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            flash.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {flash.text}
        </div>
      )}

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
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          <p>No slots in this date range.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-3 text-sm font-semibold text-indigo-600 hover:underline"
          >
            Add your availability
          </button>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
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
                  <td className="px-4 py-3 text-sm">
                    {s.status === 'booked' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openReschedule(s)}
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCancelSlot(s); setCancelReason(''); }}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Add availability</h2>
            <p className="text-sm text-slate-600 mb-4">
              We split your window into bookable slots. Students see them on the Mocks page immediately.
            </p>
            <form onSubmit={handleCreateSlots} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={createForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start time</label>
                <input
                  type="time"
                  value={createForm.startTime}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Number of slots</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={createForm.numSlots}
                    onChange={(e) => setCreateForm((f) => ({ ...f, numSlots: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Each slot (min)</label>
                  <select
                    value={createForm.durationPreset}
                    onChange={(e) => setCreateForm((f) => ({ ...f, durationPreset: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="20">20</option>
                    <option value="25">25</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              {createForm.durationPreset === 'custom' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Custom duration (15–60 min)</label>
                  <input
                    type="number"
                    min={15}
                    max={60}
                    value={createForm.durationCustom}
                    onChange={(e) => setCreateForm((f) => ({ ...f, durationCustom: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Meet link <span className="text-slate-400 font-normal">(optional, same for all slots)</span>
                </label>
                <input
                  type="url"
                  value={createForm.meetLink}
                  onChange={(e) => setCreateForm((f) => ({ ...f, meetLink: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createSaving ? <ButtonLoader className="inline h-4 w-4 text-white" /> : 'Publish slots'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rescheduleSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Reschedule slot</h2>
            <p className="text-sm text-slate-600 mb-4">
              {formatDateTime(rescheduleSlot.start_at)} – {formatDateTime(rescheduleSlot.end_at)}
              {rescheduleSlot.aspirant_name && (
                <span className="block mt-1">Aspirant: {rescheduleSlot.aspirant_name}</span>
              )}
            </p>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New start</label>
                <input
                  type="datetime-local"
                  value={rescheduleForm.start}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, start: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New end</label>
                <input
                  type="datetime-local"
                  value={rescheduleForm.end}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, end: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={rescheduleSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {rescheduleSaving ? <ButtonLoader className="inline h-4 w-4 text-white" /> : 'Reschedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleSlot(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Cancel slot</h2>
            <p className="text-sm text-slate-600 mb-4">
              {formatDateTime(cancelSlot.start_at)} – {cancelSlot.aspirant_name ?? 'No aspirant'}
            </p>
            <p className="text-sm text-slate-600 mb-2">The aspirant will be notified. Optional reason (internal):</p>
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={cancelSaving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelSaving ? <ButtonLoader className="inline h-4 w-4 text-white" /> : 'Cancel slot'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCancelSlot(null); setCancelReason(''); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
