import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiAcademicCap,
  HiCalendarDays,
  HiCheckBadge,
  HiCheckCircle,
  HiClock,
  HiPlayCircle,
  HiSparkles,
  HiTrophy,
  HiUserGroup,
} from 'react-icons/hi2';
import { PageLoader } from '../../../components/ui/Loader';
import {
  formatCourseDate,
  joinCourseFree,
  listActiveCourses,
  requestCourseJoin,
} from '../../../lib/courses';
import { useProfileOnboardingGate } from '../hooks/useProfileOnboardingGate';

const OFFER_POINTS = [
  {
    icon: HiPlayCircle,
    title: 'Live classes + recordings',
    text: 'Join live every day and rewatch from your dashboard whenever you need.',
  },
  {
    icon: HiAcademicCap,
    title: 'AI / ML coding path',
    text: 'A structured curriculum — fundamentals to practical AI/ML skills.',
  },
  {
    icon: HiUserGroup,
    title: 'NTH trainer guidance',
    text: 'Learn with Naveen Talent Hub trainers who coach for real placements.',
  },
  {
    icon: HiTrophy,
    title: 'Full course + Golden Batch',
    text: 'Top performers can unlock the full course and Golden Batch (mocks & more).',
  },
];

function scrollAndFocusJoinForm() {
  const panel = document.getElementById('join-course-form');
  if (!panel) return;
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    const field =
      panel.querySelector('textarea[name="join-reason"]') ||
      panel.querySelector('button[data-join-cta]') ||
      panel.querySelector('button, textarea, input');
    if (field && typeof field.focus === 'function') {
      field.focus({ preventScroll: true });
    }
    panel.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
    window.setTimeout(() => {
      panel.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2');
    }, 1600);
  }, 350);
}

function OfferHero({
  courseTitle,
  startDate,
  onFocusForm,
  showCta = true,
  ctaLabel = 'Request / Join now',
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/20 shadow-xl shadow-slate-900/20"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fbbf24\' fill-opacity=\'0.9\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
        aria-hidden
      />

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
            <HiSparkles className="h-3.5 w-3.5" />
            <span>Limited seats</span>
            <span className="nth-free-coding-offer-badge">HOT</span>
          </span>
          {startDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100 backdrop-blur-sm">
              <HiCalendarDays className="h-3.5 w-3.5" />
              Starts {startDate}
            </span>
          ) : null}
        </div>

        <h1 className="mt-5 max-w-3xl text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          Free Coding Classes
          <span className="mt-1 block text-amber-300">
            &amp; Golden Batch
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-lg">
          {courseTitle ? (
            <>
              Enroll in <span className="font-semibold text-white">{courseTitle}</span> — learn live with
              NTH, revise with recordings, and compete for the full course + Golden Batch benefits.
            </>
          ) : (
            <>
              Learn live with Naveen Talent Hub, revise with recordings, and compete for the full
              course + Golden Batch benefits.
            </>
          )}
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-amber-100/90 sm:text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <HiClock className="h-4 w-4 text-amber-300" />
            Daily sessions
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <HiPlayCircle className="h-4 w-4 text-amber-300" />
            Class recordings
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <HiTrophy className="h-4 w-4 text-amber-300" />
            Full course + Golden Batch
          </span>
        </div>

        {showCta && onFocusForm ? (
          <div className="mt-7">
            <button
              type="button"
              onClick={onFocusForm}
              className="inline-flex w-full sm:w-auto min-h-12 items-center justify-center gap-2 rounded-full border border-amber-600/40 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-5 py-3.5 text-sm font-extrabold text-amber-950 shadow-md shadow-amber-900/20 transition hover:brightness-105"
            >
              <HiSparkles className="h-4 w-4 shrink-0" />
              {ctaLabel}
            </button>
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

function BenefitsGrid({ onFocusForm }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {OFFER_POINTS.map((item, i) => {
        const Icon = item.icon;
        const Wrapper = onFocusForm ? 'button' : 'div';
        return (
          <motion.li
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
          >
            <Wrapper
              type={onFocusForm ? 'button' : undefined}
              onClick={onFocusForm || undefined}
              className={`group relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md ${
                onFocusForm ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400' : ''
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 opacity-80" />
              <div className="flex gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 ring-1 ring-amber-200/80">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-[13px]">{item.text}</p>
                  {onFocusForm ? (
                    <p className="mt-2 text-[11px] font-semibold text-amber-700 opacity-0 transition group-hover:opacity-100">
                      Tap to continue →
                    </p>
                  ) : null}
                </div>
              </div>
            </Wrapper>
          </motion.li>
        );
      })}
    </ul>
  );
}

function EnrolledCard({ course }) {
  const startLabel = formatCourseDate(course.free_starts_at);
  const hasStart = Boolean(course.free_starts_at);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-lg shadow-emerald-900/5"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-100/80 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <HiCheckBadge className="h-9 w-9" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200/80">
              <HiSparkles className="h-3.5 w-3.5" />
              You&apos;re in
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Congratulations!
            </h2>
            <p className="text-base text-slate-600 sm:text-lg">
              You have enrolled in{' '}
              <span className="font-semibold text-slate-900">{course.title}</span>.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-4">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80">
              <HiCalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {hasStart ? 'Course starts from' : 'Schedule'}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {hasStart ? startLabel : 'Dates will be announced soon'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-4">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/80">
              <HiAcademicCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What&apos;s next</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Classes appear here</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Recordings &amp; schedule unlock as sessions are added.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function JoinPanel({
  course,
  reason,
  onReasonChange,
  busy,
  onJoin,
  onRequest,
  actionMsg,
  isPrimaryForm = false,
  profileComplete = true,
  onCompleteProfile,
}) {
  const status = course.membership_status;
  const invited = Boolean(course.is_invited);
  const pending = status === 'requested';
  const rejected = status === 'rejected';
  /** Pending or closed seat — never show rejection copy; no form. */
  const seatWaiting = pending || rejected;
  const needsProfile = !profileComplete && !seatWaiting;
  const canAct = !seatWaiting && profileComplete;

  return (
    <motion.article
      id={isPrimaryForm ? 'join-course-form' : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.35 }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 transition ring-offset-2"
    >
      <div className="relative overflow-hidden border-b border-amber-100 bg-gradient-to-br from-amber-50 via-yellow-50 to-white px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-200/50 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">Secure your seat</p>
            <h2 className="mt-1.5 text-xl font-extrabold text-slate-900 sm:text-2xl">{course.title}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
              <HiCalendarDays className="h-4 w-4 text-amber-600" />
              Starts {formatCourseDate(course.free_starts_at)}
            </p>
          </div>
          {seatWaiting ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
              Pending
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">You&apos;ll get</p>
          <ul className="mt-2.5 space-y-2">
            {[
              'Live coding classes with recordings in one place',
              'AI/ML focused path with NTH trainer support',
              'Chance to unlock full course + Golden Batch',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-slate-700">
                <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {seatWaiting ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-950">
            Your seat request is pending. We&apos;ll unlock access when a slot is available —
            keep this page bookmarked for updates.
          </div>
        ) : null}

        {needsProfile ? (
          <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-amber-950">Please complete your profile</p>
            <p className="text-sm leading-relaxed text-amber-900/85">
              Add your basic details on the profile page, then come back to join.
            </p>
            <button
              type="button"
              onClick={onCompleteProfile}
              className="inline-flex w-full items-center justify-center rounded-full bg-amber-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-500 sm:w-auto sm:min-w-[200px]"
            >
              Complete profile
            </button>
          </div>
        ) : null}

        {canAct && invited ? (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
            <p className="text-sm font-medium text-emerald-950">
              You&apos;re invited — join now and you&apos;re set for class day.
            </p>
            <button
              type="button"
              data-join-cta
              disabled={busy}
              onClick={onJoin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-600/40 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-5 py-3.5 text-sm font-extrabold text-amber-950 shadow-md shadow-amber-900/20 transition hover:brightness-105 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
            >
              <HiSparkles className="h-4 w-4" />
              {busy ? 'Joining…' : 'Join this course'}
            </button>
          </div>
        ) : null}

        {canAct && !invited ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div>
              <p className="text-sm font-bold text-slate-900">Request to join</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                Tell us why you&apos;re serious. Clear, honest reasons get approved faster.
              </p>
            </div>
            <label className="block text-sm">
              <span className="font-semibold text-slate-800">Your reason</span>
              <textarea
                name="join-reason"
                rows={4}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Hi, I recently graduated and I'm really interested in AI/ML. I want to learn with NTH and work toward placements…"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none ring-amber-400/0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={onRequest}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
            >
              {busy ? 'Submitting…' : 'Submit join request'}
            </button>
          </div>
        ) : null}

        {actionMsg?.text ? (
          <p className={`text-sm font-medium ${actionMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {actionMsg.text}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}

export default function CoursesPage() {
  const { profileComplete, goToOnboarding, requireCompleteProfile } = useProfileOnboardingGate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reasonById, setReasonById] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionMsg, setActionMsg] = useState({ id: '', type: '', text: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await listActiveCourses();
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load courses');
      setCourses([]);
      return;
    }
    setCourses(res.courses || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleJoin = async (courseId) => {
    if (!requireCompleteProfile()) return;
    setBusyId(courseId);
    setActionMsg({ id: courseId, type: '', text: '' });
    const res = await joinCourseFree(courseId);
    setBusyId(null);
    if (!res.ok) {
      setActionMsg({ id: courseId, type: 'error', text: res.error || 'Could not join' });
      return;
    }
    setActionMsg({ id: '', type: '', text: '' });
    load();
  };

  const handleRequest = async (courseId) => {
    if (!requireCompleteProfile()) return;
    const reason = (reasonById[courseId] || '').trim();
    setBusyId(courseId);
    setActionMsg({ id: courseId, type: '', text: '' });
    const res = await requestCourseJoin(courseId, reason);
    setBusyId(null);
    if (!res.ok) {
      setActionMsg({ id: courseId, type: 'error', text: res.error || 'Could not submit request' });
      return;
    }
    setActionMsg({
      id: courseId,
      type: 'success',
      text: 'Request submitted. Admin will review and unlock you soon.',
    });
    load();
  };

  const joinedCourses = courses.filter((c) => c.membership_status === 'free');
  const otherCourses = courses.filter((c) => c.membership_status !== 'free');
  const featured = otherCourses[0] || joinedCourses[0] || null;
  const featuredSeatWaiting =
    featured &&
    (featured.membership_status === 'requested' || featured.membership_status === 'rejected');
  const canFocusJoinForm = Boolean(featured) && !featuredSeatWaiting && profileComplete;
  const heroCtaHandler = !profileComplete
    ? goToOnboarding
    : canFocusJoinForm
      ? scrollAndFocusJoinForm
      : undefined;
  const heroCtaLabel = !profileComplete ? 'Complete profile' : 'Request / Join now';
  const showHeroCta = Boolean(heroCtaHandler);

  if (loading) {
    return <PageLoader size="md" label="Loading…" className="py-12" />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6 pb-6 px-0">
      {courses.length === 0 ? (
        <>
          <OfferHero
            onFocusForm={!profileComplete ? goToOnboarding : undefined}
            showCta={!profileComplete}
            ctaLabel="Complete profile"
          />
          <BenefitsGrid />
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
            No open batches right now. Check back soon — seats fill fast.
          </p>
        </>
      ) : (
        <>
          {otherCourses.length > 0 ? (
            <>
              <OfferHero
                courseTitle={featured?.title}
                startDate={formatCourseDate(featured?.free_starts_at)}
                onFocusForm={heroCtaHandler}
                showCta={showHeroCta}
                ctaLabel={heroCtaLabel}
              />
              <BenefitsGrid
                onFocusForm={
                  !profileComplete
                    ? goToOnboarding
                    : canFocusJoinForm
                      ? scrollAndFocusJoinForm
                      : undefined
                }
              />
              <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">How it works</p>
                  <ol className="mt-4 space-y-4">
                    {[
                      { step: '01', title: 'Request or join', text: 'Invited users join instantly. Others send a short reason.' },
                      { step: '02', title: 'Get approved', text: 'Admin reviews your profile + reason and unlocks access.' },
                      { step: '03', title: 'Attend & record', text: 'Show up live. Missed a class? Watch the recording here.' },
                      { step: '04', title: 'Aim for Golden Batch', text: 'Stand out — selected aspirants unlock full course + Golden Batch.' },
                    ].map((row) => (
                      <li key={row.step}>
                        {canFocusJoinForm || !profileComplete ? (
                          <button
                            type="button"
                            onClick={!profileComplete ? goToOnboarding : scrollAndFocusJoinForm}
                            className="flex w-full gap-3 rounded-xl p-1 text-left transition hover:bg-amber-50/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-amber-300">
                              {row.step}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{row.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{row.text}</p>
                            </div>
                          </button>
                        ) : (
                          <div className="flex w-full gap-3 rounded-xl p-1 text-left">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-amber-300">
                              {row.step}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{row.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{row.text}</p>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                  {!profileComplete ? (
                    <button
                      type="button"
                      onClick={goToOnboarding}
                      className="mt-5 w-full rounded-full bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-500"
                    >
                      Complete profile
                    </button>
                  ) : canFocusJoinForm ? (
                    <button
                      type="button"
                      onClick={scrollAndFocusJoinForm}
                      className="mt-5 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      Open join form
                    </button>
                  ) : null}
                </div>
                <div className="space-y-5">
                  {otherCourses.map((c, index) => (
                    <JoinPanel
                      key={c.id}
                      course={c}
                      isPrimaryForm={index === 0}
                      reason={reasonById[c.id] || ''}
                      onReasonChange={(value) => setReasonById((m) => ({ ...m, [c.id]: value }))}
                      busy={busyId === c.id}
                      onJoin={() => handleJoin(c.id)}
                      onRequest={() => handleRequest(c.id)}
                      actionMsg={actionMsg.id === c.id ? actionMsg : null}
                      profileComplete={profileComplete}
                      onCompleteProfile={goToOnboarding}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {joinedCourses.map((c) => (
            <EnrolledCard key={c.id} course={c} />
          ))}
        </>
      )}
    </div>
  );
}
