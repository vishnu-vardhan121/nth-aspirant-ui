import { useEffect, useState } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { ButtonLoader } from '../ui/Loader';
import { updateInterviewerMeetLink } from '../../lib/interviewerMeetLink';

export default function EditMeetLinkModal({ open, onClose, onSaved, slotId, mockRegistrationId, initialLink = '' }) {
  const [meetLink, setMeetLink] = useState(initialLink || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMeetLink(initialLink || '');
      setError('');
    }
  }, [open, initialLink]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateInterviewerMeetLink({
        slotId,
        mockRegistrationId,
        meetLink,
      });
      onSaved?.(meetLink.trim() || null);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not save Meet link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-meet-link-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-meet-link-title" className="text-lg font-semibold text-slate-900">
              Edit Meet link
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Aspirants see this on their Mocks page. Booked mocks are notified when you save a new link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="meet-link-input" className="mb-1 block text-sm font-medium text-slate-700">
              Google Meet URL
            </label>
            <input
              id="meet-link-input"
              type="url"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <ButtonLoader className="inline h-4 w-4 text-white" /> : 'Save link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
