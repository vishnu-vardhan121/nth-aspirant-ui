import { useState } from 'react';
import { HiUserCircle } from 'react-icons/hi2';
import InterviewerCandidateProfileModal from './InterviewerCandidateProfileModal';

export default function ViewCandidateProfileButton({
  mockRegistrationId,
  label = 'Profile',
  className = '',
  showIcon = true,
  variant = 'outline',
}) {
  const [open, setOpen] = useState(false);

  if (!mockRegistrationId) return null;

  const variantClass =
    variant === 'solid'
      ? 'rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700'
      : 'rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 ${variantClass} ${className}`}
      >
        {showIcon ? <HiUserCircle className="h-3.5 w-3.5 text-indigo-600" aria-hidden /> : null}
        {label}
      </button>
      {open ? (
        <InterviewerCandidateProfileModal mockRegistrationId={mockRegistrationId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
