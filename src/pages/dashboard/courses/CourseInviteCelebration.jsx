import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSparkles, HiXMark, HiTicket, HiCheckBadge } from 'react-icons/hi2';

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

function ConfettiLayer() {
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 7) % 100}%`,
    delay: (i % 7) * 0.08,
    duration: 2.2 + (i % 5) * 0.15,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 4) * 2,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-sm opacity-90"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, rotate: 0, opacity: 0 }}
          animate={{
            y: ['0vh', '95vh'],
            rotate: [0, 360 * (p.id % 2 === 0 ? 1 : -1)],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        />
      ))}
    </div>
  );
}

/**
 * @param {'invite' | 'joined'} mode
 */
export default function CourseInviteCelebration({
  open,
  mode = 'invite',
  courseTitle = '',
  onClose,
  onPrimary,
  primaryBusy = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  const isJoined = mode === 'joined';
  const titleId = isJoined ? 'course-joined-celebration-title' : 'course-invite-celebration-title';

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onClick={onClose}
        >
          <ConfettiLayer />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl sm:rounded-3xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-linear-to-br from-indigo-600 via-violet-600 to-indigo-700 px-4 pb-6 pt-4 text-center text-white sm:px-6 sm:pb-7 sm:pt-5">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <img
                  src="/white-logo.png"
                  alt="Naveen Talent Hub"
                  className="h-7 w-auto object-contain sm:h-8"
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              </div>

              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:h-14 sm:w-14">
                {isJoined ? (
                  <HiCheckBadge className="h-7 w-7 text-amber-200 sm:h-8 sm:w-8" aria-hidden />
                ) : (
                  <HiTicket className="h-7 w-7 text-amber-200 sm:h-8 sm:w-8" aria-hidden />
                )}
              </div>

              <h2 id={titleId} className="text-xl font-black tracking-tight sm:text-[1.7rem]">
                {isJoined ? "You're in!" : "You're invited!"}
              </h2>
              <p className="mt-2 text-[13px] text-indigo-100 sm:text-base">
                {isJoined ? (
                  <>
                    Your seat for{' '}
                    <span className="font-bold text-white">{courseTitle || 'Free Coding Classes'}</span>{' '}
                    is unlocked.
                  </>
                ) : (
                  <>
                    You have a special invite to{' '}
                    <span className="font-bold text-white">{courseTitle || 'Free Coding Classes'}</span>.
                  </>
                )}
              </p>
            </div>

            <div className="space-y-3 overflow-y-auto px-4 py-5 sm:space-y-4 sm:px-6 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <p className="text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                {isJoined
                  ? 'Live classes show on Free Coding Classes when the batch starts. Bookmark the page and show up on day one.'
                  : 'Join in one tap — no request needed. Secure your seat and get ready for live classes with NTH.'}
              </p>

              {isJoined ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="nth-btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold"
                >
                  <HiSparkles className="h-4 w-4" aria-hidden />
                  Continue
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={primaryBusy}
                    onClick={onPrimary}
                    className="nth-btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold disabled:opacity-60"
                  >
                    <HiSparkles className="h-4 w-4" aria-hidden />
                    {primaryBusy ? 'Joining…' : 'Join this course'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
                  >
                    Maybe later
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function courseCelebrationKey(userId, courseId, kind) {
  return `nth_course_${kind}_${userId}_${courseId}`;
}

export function hasShownCourseCelebration(userId, courseId, kind) {
  if (!userId || !courseId || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(courseCelebrationKey(userId, courseId, kind)) === '1';
  } catch {
    return false;
  }
}

export function markCourseCelebrationShown(userId, courseId, kind) {
  if (!userId || !courseId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(courseCelebrationKey(userId, courseId, kind), '1');
  } catch {
    /* ignore */
  }
}
