import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppDispatch } from '../../../store/hooks';
import { setAspirantProfile } from '../../../store/slices/aspirantSlice';
import { supabase } from '../../../lib/supabase';
import { ButtonLoader } from '../../../components/ui/Loader';
import {
  isValidMobileNumber,
  MOBILE_VALIDATION_MESSAGE,
  saveAspirantContactDetails,
} from '../../../lib/aspirantProfile';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export default function AspirantContactModal({ open, userId, email, profile, onSaved }) {
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName((prev) => prev || String(profile?.full_name ?? '').trim());
    setPhone((prev) => prev || String(profile?.phone ?? '').trim());
    setError('');
    setSaving(false);
  }, [open, profile?.full_name, profile?.phone]);

  if (!open || !userId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (!isValidMobileNumber(trimmedPhone)) {
      setError(MOBILE_VALIDATION_MESSAGE);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const saved = await saveAspirantContactDetails(supabase, {
        fullName: trimmedName,
        phone: trimmedPhone,
        userId,
        email,
      });
      dispatch(setAspirantProfile(saved));
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="contact-modal-title" className="text-lg font-bold text-slate-900">
          Welcome to Naveen Talent Hub
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Share your name and mobile number so our team can reach you about mocks and jobs.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="contact-full-name" className="mb-1.5 block text-sm font-medium text-slate-800">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your full name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-slate-800">
              Mobile number <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          {email ? (
            <p className="text-xs text-slate-500">
              Account email: <span className="font-medium text-slate-700">{email}</span>
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="nth-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-60"
          >
            {saving ? <ButtonLoader /> : null}
            Save and continue
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
