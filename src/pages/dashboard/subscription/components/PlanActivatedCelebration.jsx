import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiAcademicCap, HiBriefcase, HiSparkles, HiXMark } from 'react-icons/hi2';

const PLAN_LABELS = { base: 'Base', silver: 'Silver', gold: 'Gold' };

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

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

export default function PlanActivatedCelebration({ open, plan, needsOnboarding = false, onClose }) {
  const planLabel = PLAN_LABELS[plan] ?? plan ?? 'Your';

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
            aria-labelledby="plan-celebration-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="bg-linear-to-br from-indigo-600 via-violet-600 to-indigo-700 px-6 pb-8 pt-10 text-center text-white">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-xl p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" />
              </button>

              <motion.div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.06, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
              >
                <HiSparkles className="h-9 w-9" aria-hidden />
              </motion.div>

              <h2 id="plan-celebration-title" className="text-2xl font-black tracking-tight sm:text-3xl">
                You&apos;re all set!
              </h2>
              <p className="mt-2 text-sm text-indigo-100 sm:text-base">
                Your <span className="font-bold text-white">{planLabel}</span> plan is now active.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm leading-relaxed text-slate-600">
                Your payment was verified and your subscription is live.
                {needsOnboarding
                  ? ' Next, complete your profile so we can schedule your mock interviews with IT working professionals.'
                  : ' We also sent you a message with the details — check Messages anytime.'}
              </p>
              {!needsOnboarding ? (
                <p className="text-sm font-medium text-slate-800">
                  Start with a mock interview or explore open jobs on your dashboard.
                </p>
              ) : null}

              {needsOnboarding ? (
                <Link
                  to="/onboarding?welcome=1"
                  onClick={onClose}
                  className="nth-btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold no-underline"
                >
                  Complete your profile
                </Link>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Link
                    to="/dashboard/mocks"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
                  >
                    <HiAcademicCap className="h-5 w-5 shrink-0" aria-hidden />
                    Book a mock
                  </Link>
                  <Link
                    to="/dashboard/jobs"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    <HiBriefcase className="h-5 w-5 shrink-0" aria-hidden />
                    Browse jobs
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
              >
                {needsOnboarding ? "I'll do this later" : 'Continue to dashboard'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
