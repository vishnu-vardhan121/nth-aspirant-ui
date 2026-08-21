import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiSparkles, HiTrophy, HiXMark } from 'react-icons/hi2';

const CONFETTI_COLORS = ['#f59e0b', '#fbbf24', '#f97316', '#eab308', '#fde047', '#fb923c'];

function ConfettiLayer() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
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
 * Shown after admin verifies an aspirant's first Golden Batch payment — replaces the
 * generic placement Silver/Gold "plan activated" modal for this specific event.
 */
export default function CourseGoldenActivatedCelebration({ open, courseTitle = '', onClose }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <ConfettiLayer />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-golden-celebration-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="bg-linear-to-br from-amber-500 via-orange-500 to-amber-600 px-6 pb-8 pt-10 text-center text-white">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>

              <motion.div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
              >
                <HiTrophy className="h-9 w-9" aria-hidden />
              </motion.div>

              <h2
                id="course-golden-celebration-title"
                className="text-2xl font-black tracking-tight sm:text-3xl"
              >
                Welcome to Golden Batch!
              </h2>
              <p className="mt-2 text-sm text-amber-50 sm:text-base">
                Your payment is verified — Golden access for{' '}
                <span className="font-bold text-white">{courseTitle || 'your course'}</span> is now
                live.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm leading-relaxed text-slate-600">
                You&apos;ve unlocked Golden live classes, recordings, and the full course. Head to
                your course to see what&apos;s new.
              </p>

              <Link
                to="/dashboard/courses"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3.5 text-sm font-bold text-white no-underline transition-colors hover:bg-amber-500"
              >
                <HiSparkles className="h-4 w-4 shrink-0" aria-hidden />
                Go to my course
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
              >
                Continue to dashboard
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
