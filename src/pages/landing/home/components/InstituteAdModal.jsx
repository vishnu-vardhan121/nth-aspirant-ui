/**
 * Institute ad modal: sponsor image (~80% viewport) when DB has an active ad;
 * otherwise a “Promote with NTH” card (matches marketing layout).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiMegaphone, HiEnvelope } from 'react-icons/hi2';

export const ADS_CONTACT_EMAIL = 'hello@naveentalenthub.in';

/** Persisted when visitor checks “Don’t show again” on the promo fallback. */
export const LANDING_INSTITUTE_AD_DISMISS_KEY = 'nth_landing_institute_promo_modal_dismiss_v1';

/** One inbox for hiring partners, promotions, sponsorships, and other outreach. */
const MAILTO_TEAM = `mailto:${ADS_CONTACT_EMAIL}?subject=${encodeURIComponent('Naveen Talent Hub – hiring, promotion, or partnership')}`;

export default function InstituteAdModal({ open, onClose, ad }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const isFallback = ad?.isFallback === true;

  useEffect(() => {
    if (open && isFallback) setDontShowAgain(false);
  }, [open, isFallback]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !ad) return null;

  const finishClose = (opts) => {
    onClose?.(opts);
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-slate-950/40 p-2 backdrop-blur-md sm:p-4"
      onClick={() => finishClose({ dontShowAgain: isFallback ? dontShowAgain : false })}
      role="dialog"
      aria-modal="true"
      aria-label={isFallback ? 'Hiring and promotions with Naveen Talent Hub' : 'Sponsor advertisement'}
    >
      <div
        className={`pointer-events-auto relative ${isFallback ? 'w-full max-w-xl' : 'flex h-full min-h-0 w-full max-w-none max-h-none items-center justify-center sm:max-w-[80vw] sm:max-h-[80vh]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishClose({ dontShowAgain: isFallback ? dontShowAgain : false });
          }}
          className={
            isFallback
              ? 'absolute right-4 top-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'
              : 'fixed right-[max(0.75rem,env(safe-area-inset-right,0px))] top-[max(0.75rem,env(safe-area-inset-top,0px))] z-203 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-black/70 text-[1.8rem] font-black leading-none text-white shadow-xl transition-colors hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:absolute sm:right-3 sm:top-3 sm:z-201 sm:h-10 sm:w-10 sm:bg-black/60 sm:text-[1.7rem]'
          }
          aria-label="Close"
        >
          ×
        </button>

        {isFallback ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.25)]">
            <div className="px-7 pb-7 pt-14 sm:px-9 sm:pb-8 sm:pt-16">
              {/* Illustration */}
              <div className="relative mx-auto mb-7 flex h-22 w-22 items-center justify-center">
                <span
                  className="absolute -left-1 top-0 text-lg font-light text-orange-400/90 motion-reduce:opacity-80"
                  aria-hidden
                >
                  +
                </span>
                <span className="absolute -right-0.5 top-2 text-[10px] text-violet-400 motion-reduce:opacity-80" aria-hidden>
                  ◆
                </span>
                <span
                  className="absolute bottom-1 -left-2 h-1.5 w-1.5 rounded-full bg-violet-300 motion-reduce:opacity-80"
                  aria-hidden
                />
                <span
                  className="absolute -bottom-0.5 right-2 h-1 w-1 rounded-full bg-orange-300 motion-reduce:opacity-80"
                  aria-hidden
                />
                <div className="flex h-18 w-18 items-center justify-center rounded-full bg-violet-100 ring-4 ring-violet-50/80">
                  <HiMegaphone className="h-9 w-9 text-indigo-600" aria-hidden />
                </div>
              </div>

              <h2 className="text-center text-lg font-bold text-slate-800 sm:text-xl">
                Hiring, promotions &amp; more with
                <span className="mt-1 block bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-[1.65rem]">
                  Naveen Talent Hub
                </span>
              </h2>

              <p className="mt-5 text-center text-sm leading-relaxed text-slate-600">
                If you have open roles, a campaign, or something valuable to share with our audience, feel free to reach out.
              </p>
              <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
                Our team handles all hiring partnerships and promotions through a single point of contact-so you always know
                where to connect.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={MAILTO_TEAM}
                  className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition-[background-color,box-shadow] duration-200 hover:bg-indigo-700 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:flex-initial sm:min-w-44"
                >
                  <HiEnvelope className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
                  Contact us
                </a>
                <Link
                  to="/jobs"
                  onClick={() => finishClose({ dontShowAgain })}
                  className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-indigo-600 bg-white px-5 py-3 text-sm font-bold text-indigo-600 transition-colors duration-200 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:flex-initial sm:min-w-44"
                >
                  View Opportunities
                </Link>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-indigo-600 ring-1 ring-violet-200/60">
                      <HiEnvelope className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="min-w-0 pt-0.5 text-sm leading-snug text-slate-600">
                      <span className="text-slate-500">Same inbox for hiring &amp; promotions</span>
                      <br />
                      <a
                        href={MAILTO_TEAM}
                        className="font-bold text-indigo-600 underline decoration-indigo-200 underline-offset-2 transition-colors hover:text-indigo-800"
                      >
                        {ADS_CONTACT_EMAIL}
                      </a>
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 self-start sm:self-center">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-600">Don&apos;t show again</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative inline-flex max-h-full max-w-full items-center justify-center pt-14 sm:pt-0">
            {ad.linkUrl ? (
              <a
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex max-h-full max-w-full items-center justify-center"
              >
                <img
                  src={ad.imageUrl}
                  alt=""
                  className="max-h-[calc(100dvh-10.5rem)] max-w-[94vw] h-auto w-auto rounded-lg object-contain shadow-2xl sm:max-h-[80vh] sm:max-w-[80vw]"
                />
              </a>
            ) : (
              <img
                src={ad.imageUrl}
                alt=""
                className="max-h-[calc(100dvh-10.5rem)] max-w-[94vw] h-auto w-auto rounded-lg object-contain shadow-2xl sm:max-h-[80vh] sm:max-w-[80vw]"
              />
            )}
            <a
              href={MAILTO_TEAM}
              title={`${ADS_CONTACT_EMAIL} - ads & sponsorships`}
              aria-label={`Email ${ADS_CONTACT_EMAIL} about ads and sponsorships`}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] left-[max(0.5rem,env(safe-area-inset-left,0px))] right-[max(0.5rem,env(safe-area-inset-right,0px))] z-202 flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-black/70 px-2.5 py-1.5 text-[10px] leading-tight text-white shadow-md backdrop-blur-md transition-colors hover:border-white/25 hover:bg-black/80 sm:bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:left-auto sm:right-[max(0.75rem,env(safe-area-inset-right,0px))] sm:min-h-0 sm:w-max sm:max-w-[min(100%,13.5rem)] sm:justify-start sm:gap-2 sm:rounded-md sm:px-2 sm:py-1.5 sm:text-[10px] md:text-[11px]"
            >
              <HiEnvelope className="h-3 w-3 shrink-0 text-white/85" aria-hidden />
              <span className="min-w-0 text-center sm:text-left">
                <span className="text-white/65">Ads · </span>
                <span className="font-semibold underline decoration-white/30 underline-offset-2">Email us</span>
                <span className="sr-only">{` ${ADS_CONTACT_EMAIL}`}</span>
              </span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
