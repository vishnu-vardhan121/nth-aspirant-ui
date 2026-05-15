import {
  Ban,
  BadgeCheck,
  CalendarDays,
  Clock,
  FileText,
  Mail,
  MonitorPlay,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/Navbar';
import SectionContainer from '../../../components/SectionContainer';
import Seo from '../../../components/Seo';
import { Card, CardContent } from '../../../components/ui/card';
import LegalHeaderCard from './components/LegalHeaderCard';
import LegalSectionCard from './components/LegalSectionCard';
import LegalSectionNav from './components/LegalSectionNav';

const LAST_UPDATED = 'May 15, 2026';
const SUPPORT_EMAIL = 'support@naveentalenthub.in';

const DISCLAIMER =
  'Naveen Talent Hub provides preparation, mentorship, and recruiter-facing support services. Payments are made for access to these services and operational effort, not for guaranteed hiring outcomes.';

const QUICK_FACTS = [
  {
    icon: CalendarDays,
    title: 'Last updated',
    value: LAST_UPDATED,
    detail: 'Updated when payment or delivery rules change.',
  },
  {
    icon: Mail,
    title: 'Support',
    value: SUPPORT_EMAIL,
    detail: 'Refunds, cancellations, reschedules, and payment issues.',
  },
];

const REFUND_SECTIONS = [
  {
    id: 'interview-guarantee',
    icon: BadgeCheck,
    eyebrow: 'Guarantee',
    title: 'Interview Guarantee',
    intro:
      'If we are unable to arrange at least one direct company interview opportunity for you under your eligible plan, you are entitled to a full refund. This applies to Silver and Gold plans where interview introductions are included. Mock interviews and preparation services already delivered before the request are not counted toward this condition.',
    blocks: [],
    bullets: [],
  },
  {
    id: 'service-delivery',
    icon: MonitorPlay,
    eyebrow: 'Delivery',
    title: 'Service Delivery',
    intro:
      'Naveen Talent Hub delivers all services digitally. After payment is confirmed, our team will contact you within 1–2 business days to schedule your onboarding and first session. Services are delivered via video calls, platform dashboard, email, and messaging. No physical goods are shipped.',
    blocks: [
      {
        heading: 'Contact after payment',
        body:
          'If you do not receive a response within 2 business days of payment, email support@naveentalenthub.in with your payment reference.',
      },
    ],
    bullets: [],
  },
  {
    id: 'introduction',
    icon: FileText,
    eyebrow: 'Overview',
    title: 'Introduction and scope',
    intro:
      'This policy covers paid services: mock interviews, mentorship, interview prep, profile review, recruiter-facing support, and related training. It works together with your plan, invoice, Terms & Conditions, and Privacy Policy.',
    blocks: [
      {
        heading: 'How requests work',
        body:
          'Submitting a request does not guarantee approval. We review plan scope, what was delivered or scheduled, participation, and the written terms from your purchase or onboarding-not hiring outcomes alone.',
      },
      {
        heading: 'What is not covered',
        body:
          'Free resources, unpaid pricing enquiries, and third-party hiring decisions. Pricing page selections are enquiries until payment and scope are confirmed in writing.',
      },
    ],
    bullets: [],
  },
  {
    id: 'refund-eligibility',
    icon: RotateCcw,
    eyebrow: 'Eligibility',
    title: 'Refund eligibility and delivery',
    intro:
      'Eligibility depends on what you bought, sessions already completed or booked, and mentor or interviewer time already allocated.',
    blocks: [
      {
        heading: 'Consumed or scheduled work',
        body:
          'Completed mocks, held calls, delivered reviews, and recruiter-facing steps already taken are generally non-refundable. Confirmed slots and no-shows (especially without notice) may count as used service.',
      },
      {
        heading: 'Decisions',
        body:
          'We use a reasonable operational review and reply by email with approval, partial credit, reschedule, or decline. No interview, offer, or placement is guaranteed.',
      },
    ],
    bullets: [],
  },
  {
    id: 'cancellations-rescheduling',
    icon: CalendarDays,
    eyebrow: 'Sessions',
    title: 'Cancellations and rescheduling',
    intro: 'Contact support early when your plans change.',
    blocks: [
      {
        heading: 'Your requests',
        body:
          'Reschedules depend on notice, plan limits, and availability. Adequate notice before an undelivered session may allow reschedule or refund review per your plan; late cancellation or no-show may forfeit the session.',
      },
      {
        heading: 'Our cancellation',
        body:
          'If we cancel for operational reasons, we will reschedule or discuss credit or refund for the affected portion.',
      },
    ],
    bullets: [],
  },
  {
    id: 'non-refundable',
    icon: Ban,
    eyebrow: 'Limits',
    title: 'Non-refundable situations and payments',
    intro: 'Subject to applicable consumer law where required.',
    blocks: [
      {
        heading: 'Usually not refundable',
        body:
          'Delivered services; missed sessions without notice; requests after plan validity; requests based solely on not receiving a job offer or interview invitation - our services cover preparation and introductions, not guaranteed outcomes; chargebacks without contacting us first.',
      },
      {
        heading: 'Failed or duplicate payments',
        body:
          'A failed UPI/bank status does not always mean we received funds-send the reference if debited without confirmation. Duplicate charges for one purchase may be corrected after gateway verification; include date, amount, and reference.',
      },
    ],
    bullets: [],
  },
  {
    id: 'processing-timelines',
    icon: Clock,
    eyebrow: 'Timelines',
    title: 'Timelines, exceptions, and updates',
    intro:
      'Send complete details (plan, payment reference, session history) for a faster review.',
    blocks: [
      {
        heading: 'Processing',
        body:
          'We aim to complete our review within 5–7 business days of receiving your complete request. Approved refunds go to the original method where possible; banks may add settlement days. Weekends and holidays may delay replies.',
      },
      {
        heading: 'Exceptions and changes',
        body:
          'Rare cases (e.g. serious emergency, platform outage, our clear error) may be reviewed individually-no precedent or automatic approval. Policy updates apply going forward; check the date above before new payments.',
      },
    ],
    bullets: [],
  },
  {
    id: 'contact-information',
    icon: Mail,
    eyebrow: 'Contact',
    title: 'Contact and misuse',
    intro: `Email ${SUPPORT_EMAIL} with subject lines such as Refund Request, Cancellation, Reschedule, or Payment Issue.`,
    blocks: [
      {
        heading: 'Include in your email',
        body:
          'Full name, registered email, phone, plan name, payment reference, and a short summary. False claims, chargeback abuse, or harassment may lead to declined requests and loss of access.',
      },
      {
        heading: 'Related pages',
        body:
          'See Terms & Conditions and the pricing page for plan scope.',
      },
    ],
    bullets: [],
  },
];

function SupportAsideCard({ className = '' }) {
  return (
    <Card
      className={`overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-900/20 ${className}`}
    >
      <CardContent className="p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">Need help?</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Include plan, payment reference, and session dates.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Refund%20Request`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
        >
          Email support
        </a>
        <Link
          to="/pricing"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          View pricing
        </Link>
        <Link
          to="/terms-and-conditions"
          className="mt-3 block text-center text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
        >
          Terms & Conditions
        </Link>
      </CardContent>
    </Card>
  );
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen min-w-0 bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(99,102,241,0.16),transparent_54%),radial-gradient(ellipse_55%_40%_at_100%_12%,rgba(14,165,233,0.10),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef2ff_100%)]"
        aria-hidden
      />
      <Seo
        title="Refund & Cancellation Policy | Naveen Talent Hub"
        description="Naveen Talent Hub's refund and cancellation policy. Silver and Gold plan holders get a full refund if we don't arrange at least one interview. Read rules for cancellations, reschedules, and payment issues."
        keywords="Naveen Talent Hub refund policy, NTH refund, cancellation policy, mock interview refund, Naveen Hub refund, interview guarantee refund India"
        canonicalUrl="https://naveentalenthub.in/refund-policy"
        ogImage="https://naveentalenthub.in/hero-section/hero-image.jpg"
      />
      <Navbar />

      <main id="main-content" className="min-w-0 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32">
        <SectionContainer className="space-y-8 sm:space-y-10">
          <LegalHeaderCard
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Refund Policy' }]}
            eyebrow="Payments"
            eyebrowIcon={ShieldCheck}
            title={
              <>
                Refund & Cancellation{' '}
                <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
                  Policy
                </span>
              </>
            }
            description="Operational rules for refunds, cancellations, reschedules, and payment issues on paid services."
            facts={QUICK_FACTS}
          />

          <div className="rounded-2xl border border-amber-200/90 bg-linear-to-r from-amber-50/90 via-white to-orange-50/60 p-5 sm:p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-amber-800">Service clarification</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">{DISCLAIMER}</p>
          </div>

          <div className="xl:hidden">
            <LegalSectionNav
              sections={REFUND_SECTIONS}
              title="On this page"
              description="Jump to a section."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
            <div className="space-y-5 sm:space-y-6">
              {REFUND_SECTIONS.map((section) => (
                <LegalSectionCard key={section.id} section={section} variant="terms" />
              ))}
              <SupportAsideCard className="xl:hidden" />
            </div>

            <aside className="hidden space-y-4 xl:sticky xl:top-28 xl:block xl:self-start">
              <LegalSectionNav sections={REFUND_SECTIONS} title="On this page" description="Jump to a section." />
              <SupportAsideCard />
            </aside>
          </div>
        </SectionContainer>
      </main>

      <Footer />
    </div>
  );
}