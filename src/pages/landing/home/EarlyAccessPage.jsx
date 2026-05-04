import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Seo from '../../../components/Seo';
import SectionContainer from '../../../components/SectionContainer';
import TalentPoolForm from './components/TalentPoolForm';
import { HiArrowLeft, HiClock, HiLockClosed, HiShieldCheck } from 'react-icons/hi2';

const TRUST_ITEMS = [
  {
    icon: HiClock,
    title: 'About 4 minutes',
    text: 'Save your profile once—no account required to submit.',
  },
  {
    icon: HiLockClosed,
    title: 'Secure resume upload',
    text: 'Your file is stored privately and only reviewed by our team.',
  },
  {
    icon: HiShieldCheck,
    title: 'Relevant outreach only',
    text: 'We contact you when there is a real match—not bulk mail.',
  },
];

export default function EarlyAccessPage() {
  useEffect(() => {
    document.documentElement.classList.remove('nth-landing-page');
    document.body.classList.remove('nth-landing-page');
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className="min-h-screen min-w-0 bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#f1f5f9_100%)]"
        aria-hidden
      />
      <Seo
        title="Join the verified shortlist | Naveen Talent Hub"
        description="Share your profile once. When a company needs your skills, we match and connect you directly—verified opportunities from Naveen Talent Hub."
        canonicalPath="/early-access"
        ogImage="/hero-section/hero-image.jpg"
      />
      <Navbar />
      <main
        id="main-content"
        className="min-w-0 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32 touch-manipulation"
      >
        <SectionContainer className="min-w-0">
          {/* Top bar */}
          <div className="mb-8 flex min-w-0 flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between lg:mb-12">
            <Link
              to="/#early-access"
              className="inline-flex w-fit min-w-0 cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition-[box-shadow,background-color,color] duration-200 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <HiArrowLeft className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Back to home
            </Link>
            <p className="text-sm font-medium text-slate-500 sm:text-right">
              <span className="text-slate-700">One form</span>
              <span className="mx-2 text-slate-300" aria-hidden>
                ·
              </span>
              ~4 minutes
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-14">
            {/* Primary column: story + form */}
            <div className="min-w-0 lg:col-span-7 xl:col-span-8">
              <header className="mb-8 min-w-0 lg:mb-10">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-indigo-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />
                  Verified shortlist
                </p>
                <h1 className="max-w-3xl text-pretty text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                  Join the{' '}
                  <span className="bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    shortlist
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  Your profile stays in our verified pool. When a company needs someone with your skills, we match and connect you
                  directly—without making you re-apply on every portal.
                </p>
              </header>

              <ul
                className="mb-8 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:mb-10"
                aria-label="What to expect"
              >
                {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
                  <li
                    key={title}
                    className="flex min-w-0 gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm shadow-slate-900/5 ring-1 ring-white/80 transition-[box-shadow,border-color] duration-200 hover:border-indigo-200/80 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-50 to-violet-50 text-indigo-700 ring-1 ring-indigo-100/80">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-xs font-bold uppercase tracking-wide text-slate-900">{title}</span>
                      <span className="mt-1 block text-xs leading-snug text-slate-600">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="min-w-0">
                <TalentPoolForm source="early_access_page" variant="page" />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="min-w-0 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 xl:top-32">
              <div className="overflow-hidden rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-lg shadow-indigo-950/5 ring-1 ring-slate-100 sm:rounded-3xl sm:p-7">
                  <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-600">Before you start</h2>
                  <ol className="mt-5 space-y-5 text-sm leading-relaxed text-slate-600">
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/25">
                        1
                      </span>
                      <span className="pt-0.5">Keep your resume ready (PDF, Word, up to 5 MB).</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/25">
                        2
                      </span>
                      <span className="pt-0.5">List your strongest skills first—we use them for matching.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/25">
                        3
                      </span>
                      <span className="pt-0.5">Be honest about communication confidence; it helps us place you well.</span>
                    </li>
                  </ol>
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <p className="text-xs leading-relaxed text-slate-500">
                      Questions? You can still browse all{' '}
                      <Link
                        to="/jobs"
                        className="cursor-pointer font-semibold text-indigo-700 underline-offset-2 transition-colors duration-200 hover:text-indigo-900 hover:underline"
                      >
                        public openings
                      </Link>{' '}
                      anytime.
                    </p>
                  </div>
                </div>
            </aside>
          </div>
        </SectionContainer>
      </main>
      <Footer />
    </div>
  );
}
