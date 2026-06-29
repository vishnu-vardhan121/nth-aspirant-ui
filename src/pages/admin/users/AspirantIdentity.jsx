/** Shared name + phone display for admin aspirant lists and modals. */

export function formatAspirantPhone(phone) {
  const value = typeof phone === 'string' ? phone.trim() : '';
  return value || null;
}

/** Single-line label for aria-labels, chat headers, etc. */
export function aspirantContactLabel({ name, phone, email }) {
  const parts = [name?.trim(), formatAspirantPhone(phone), email?.trim()].filter(Boolean);
  return parts.join(' · ') || '—';
}

/**
 * Stacked: name → phone → email (email hidden when same as name fallback).
 */
export function AspirantIdentity({
  name,
  phone,
  email,
  showEmail = true,
  nameClassName = 'font-medium text-slate-900',
  phoneClassName = 'mt-0.5 text-xs font-medium tabular-nums text-slate-600',
  emailClassName = 'mt-0.5 max-w-[240px] truncate text-xs text-slate-500',
}) {
  const displayName = name?.trim() || email?.trim() || '—';
  const displayPhone = formatAspirantPhone(phone);
  const displayEmail = email?.trim();
  const showEmailLine = showEmail && displayEmail && displayEmail !== displayName;

  return (
    <>
      <p className={nameClassName}>{displayName}</p>
      {displayPhone ? <p className={phoneClassName}>{displayPhone}</p> : null}
      {showEmailLine ? (
        <p className={emailClassName} title={displayEmail}>
          {displayEmail}
        </p>
      ) : null}
    </>
  );
}

/**
 * Inline name · phone on one line (modals, titles).
 */
export function AspirantNameWithPhone({ name, phone, email, className = 'text-sm text-slate-600' }) {
  const displayName = name?.trim() || email?.trim() || '—';
  const displayPhone = formatAspirantPhone(phone);

  return (
    <p className={className}>
      {displayName}
      {displayPhone ? <span className="font-normal text-slate-500"> · {displayPhone}</span> : null}
    </p>
  );
}
