import { useEffect, useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { supabase } from '../../lib/supabase';
import { ButtonLoader } from '../ui/Loader';
import { isValidHttpUrl, normalizeHttpUrl } from '../../lib/aspirantProfile';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
}

function preferredToLocalInput(preferredDate, preferredTime) {
  if (!preferredDate) return '';
  const time = (preferredTime || '10:00').slice(0, 5);
  const d = new Date(`${preferredDate}T${time}:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
}

function formatPreferredLabel(preferredDate, preferredTime) {
  if (!preferredDate && !preferredTime) return null;
  const datePart = preferredDate
    ? new Date(`${preferredDate}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  return [datePart, preferredTime].filter(Boolean).join(' · ');
}

export default function InterviewerScheduleMockModal({
  open,
  mock,
  onClose,
  onSuccess,
  mode = 'take',
}) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const fromPreferred = preferredToLocalInput(mock?.preferred_date, mock?.preferred_time);
    setScheduledAt(toLocalInput(mock?.scheduled_at) || fromPreferred || '');
    setMeetLink(mock?.meet_link ?? '');
    setError('');
  }, [open, mock]);

  if (!open || !mock) return null;

  const isRescheduleRequest = Boolean(mock?.reschedule_pending);
  const isReschedule = mode === 'schedule' && Boolean(mock?.scheduled_at);
  const title = mode === 'take'
    ? 'Take & schedule mock'
    : isRescheduleRequest
      ? 'Set new time (reschedule request)'
      : isReschedule
        ? 'Reschedule mock'
        : 'Schedule mock';
  const submitLabel = mode === 'take'
    ? 'Take & schedule'
    : isRescheduleRequest || isReschedule
      ? 'Save new time'
      : 'Save schedule';

  const preferredLabel = formatPreferredLabel(mock?.preferred_date, mock?.preferred_time);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!scheduledAt) {
      setError('Pick date and time.');
      return;
    }
    const link = meetLink.trim();
    if (link && !isValidHttpUrl(link)) {
      setError('Enter a valid Meet link URL.');
      return;
    }
    const normalizedLink = link ? normalizeHttpUrl(link) : null;
    const scheduledIso = new Date(scheduledAt).toISOString();

    setSaving(true);
    const rpc = mode === 'take' ? 'interviewer_take_mock_request' : 'interviewer_schedule_own_mock';

    const { data, error: rpcError } = await supabase.rpc(rpc, {
      p_registration_id: mock.id,
      p_scheduled_at: scheduledIso,
      p_meet_link: normalizedLink,
    });
    setSaving(false);

    if (rpcError) {
      setError(rpcError.message || 'Failed.');
      return;
    }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result?.ok) {
      setError(result?.error || 'Failed.');
      return;
    }
    onSuccess?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden onClick={() => !saving && onClose?.()} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-sm text-slate-600">{mock.aspirant_name ?? mock.aspirant_email}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        {mode === 'take' ? (
          <p className="mb-4 text-xs text-slate-500">
            This assigns the mock to you and notifies the aspirant with the time and Meet link.
          </p>
        ) : isRescheduleRequest ? (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            <p className="font-semibold">Aspirant requested a reschedule — old slot is already free.</p>
            {mock.previous_scheduled_at ? (
              <p className="mt-0.5">Previous: {new Date(mock.previous_scheduled_at).toLocaleString('en-IN')}</p>
            ) : null}
            {preferredLabel ? <p className="mt-0.5 font-medium">Preferred: {preferredLabel}</p> : null}
            {mock.reschedule_reason ? <p className="mt-0.5">Reason: {mock.reschedule_reason}</p> : null}
          </div>
        ) : isReschedule ? (
          <p className="mb-4 text-xs text-slate-500">
            Change the date, time, or Meet link. The aspirant will get a new message with the updated details.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date &amp; time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Google Meet link</label>
            <input
              type="url"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <ButtonLoader label="Saving…" /> : submitLabel}
            </button>
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
