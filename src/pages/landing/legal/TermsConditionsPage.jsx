import {
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Users,
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

const QUICK_FACTS = [
  {
    icon: CalendarDays,
    title: 'Last updated',
    value: LAST_UPDATED,
    detail: 'Updated when services or how we sell them change.',
  },
  {
    icon: ShieldAlert,
    title: 'Outcomes',
    value: 'No job guarantee',
    detail: 'Career support only; no job or placement guarantee.',
  },
];

const TERMS_SECTIONS = [
  {
    id: 'acceptance-of-terms',
    icon: ShieldCheck,
    eyebrow: 'Agreement',
    title: 'Acceptance and changes',
    intro:
      'By using the site, an account, or our services you agree to these terms and the Privacy Policy. The live pricing page and any email or invoice we send you set the commercial details for paid plans.',
    blocks: [
      {
        heading: 'What counts as the offer',
        body:
          'Plan names, features, prices, and on-card notes on the pricing page describe what we market. Your binding scope for payment is what we confirm in writing (for example after you submit a pricing enquiry and we agree next steps).',
      },
      {
        heading: 'Updates',
        body:
          'We may change these terms or the pricing page. Continued use after we post updates can mean you accept the new version where the law allows.',
      },
    ],
    bullets: [],
  },
  {
    id: 'pricing-and-services',
    icon: BriefcaseBusiness,
    eyebrow: 'Plans',
    title: 'Pricing page, plans, and service scope',
    intro:
      'Paid career support is organised by track (Fresher or Experienced) and plan (Base, Silver, or Gold), as shown on the pricing page. The same page lists feature bullets and short notes under each card—those notes describe preparation services, not guaranteed outcomes.',
    blocks: [
      {
        heading: 'What the tiers generally include',
        body:
          'Base lists essential mock interview practice, resume/profile support, technical preparation suggestions, and curated opportunity discovery links, with list prices shown on the site. Silver and Gold add more mock practice, application support sessions, profile feedback, and other items on the card (Gold may also include technical support, personal assistance, and founder mentorship sessions). Silver and Gold rupee amounts may appear as a placeholder until confirmed with you.',
      },
      {
        heading: 'Plan notes (from the pricing cards)',
        body:
          'Where a plan card mentions a score band on a mock for bonus preparation support, that rule only applies as written on the pricing page at the time you commit. Any bonus described on Silver or Gold is preparation support—not a promise of any interview, offer, or job.',
      },
    ],
    bullets: [
      'Application support sessions help you prepare and apply with clarity; employers control their own process and decisions.',
      'Nothing on the pricing page overrides the fact that we do not guarantee employment, salary, interviews, or employer responses.',
      'Refunds apply only when paid services are not delivered as described. See the Refund & Cancellation Policy.',
    ],
  },
  {
    id: 'accounts-and-conduct',
    icon: Users,
    eyebrow: 'You',
    title: 'Account, forms, and conduct',
    intro:
      'Keep logins safe and information truthful. The pricing lead form asks for contact and career details so we can respond-submit only what you are allowed to share.',
    blocks: [
      {
        heading: 'Accuracy',
        body:
          'You are responsible for what you upload (resume, links, answers) and for updating us if something material changes.',
      },
      {
        heading: 'Behaviour',
        body:
          'No harassment, fraud, impersonation, large-scale scraping, or attempts to break the site or other users’ access.',
      },
    ],
    bullets: [],
  },
  {
    id: 'payments-refunds-enquiries',
    icon: CreditCard,
    eyebrow: 'Money & leads',
    title: 'Enquiries, payments, and refunds',
    intro:
      'Base plan checkout may be completed online where enabled. Silver and Gold may require contact to confirm scope and price before payment. All purchases are for career support services only.',
    blocks: [
      {
        heading: 'Daily limit',
        body:
          'We manage intake to ensure every enquiry receives proper attention. If the form is temporarily unavailable, please try again shortly.',
      },
      {
        heading: 'Payment and refunds',
        body:
          'Charges, taxes, and gateway rules follow what you agree to at payment. Refunds and cancellations follow the written scope (plan text plus our confirmation), and whether a preparation session was already used or scheduled.',
      },
    ],
    bullets: ['Keep emails or invoices that describe what you bought.'],
  },
  {
    id: 'prohibited-and-enforcement',
    icon: Ban,
    eyebrow: 'Enforcement',
    title: 'Prohibited use and suspension',
    intro:
      'We may suspend or stop access if these terms are broken, risk appears, or the law requires it. Payment and IP obligations can survive closure.',
    blocks: [
      {
        heading: 'Prohibited',
        body:
          'No false credentials, forged documents, abusive contact, resale of our materials without permission, or interference with the service.',
      },
      {
        heading: 'Effect',
        body:
          'Suspension can affect dashboards, bookings, and future eligibility. We are not liable for employer outcomes, third-party delays, or outages outside our reasonable control, to the extent the law allows.',
      },
    ],
    bullets: [],
  },
  {
    id: 'legal-and-contact',
    icon: FileText,
    eyebrow: 'Legal & contact',
    title: 'IP, third parties, liability, and contact',
    intro:
      'Site content and branding stay ours unless we say otherwise. You give us a limited licence to use what you submit to deliver the services you request. External links and tools have their own terms.',
    blocks: [
      {
        heading: 'Liability and updates',
        body:
          'We are not liable for indirect damages or third-party decisions beyond what the law allows. We may revise these terms; check the date at the top when you rely on them.',
      },
      {
        heading: 'Contact',
        body:
          'hello@naveentalenthub.in - include your email, track/plan if relevant, and subject lines like “Payment”, “Cancellation”, or “Terms question”.',
      },
    ],
    bullets: [],
  },
];

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen min-w-0 bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(99,102,241,0.16),transparent_54%),radial-gradient(ellipse_55%_40%_at_100%_12%,rgba(14,165,233,0.08),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef2ff_100%)]"
        aria-hidden
      />
      <Seo
        title="Terms & Conditions | Naveen Talent Hub"
        description="Terms and Conditions for Naveen Talent Hub. Covers plan scope, pricing, payments, refunds, conduct, and what is included in Base, Silver, and Gold plans for Fresher and Experienced tracks."
        keywords="Naveen Talent Hub terms, NTH terms, Naveen Hub terms and conditions, career platform terms, mock interview terms, refund terms India"
        canonicalUrl="https://naveentalenthub.in/terms-and-conditions"
        ogImage="https://naveentalenthub.in/hero-section/hero-image.webp"
      />
      <Navbar />

      <main id="main-content" className="min-w-0 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32">
        <SectionContainer className="space-y-8 sm:space-y-10">
          <LegalHeaderCard
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Terms & Conditions' }]}
            eyebrow="Terms"
            eyebrowIcon={ShieldCheck}
            title={
              <>
                Terms & Conditions for{' '}
                <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
                  Naveen Talent Hub
                </span>
              </>
            }
            description="Short rules tied to the site and to the plans on our pricing page: tracks, Base/Silver/Gold, enquiries, payments, and what we do not guarantee."
            facts={QUICK_FACTS}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
            <div className="space-y-5 sm:space-y-6">
              {TERMS_SECTIONS.map((section) => (
                <LegalSectionCard key={section.id} section={section} variant="terms" />
              ))}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
              <LegalSectionNav sections={TERMS_SECTIONS} title="Jump to section" description="Six sections; plan detail matches the pricing page." />

              <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-900/20">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">Pricing</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Features, notes, and prices for Base, Silver, and Gold are on the pricing page first-read them before you pay.
                  </p>
                  <Link
                    to="/pricing"
                    className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    Open pricing
                  </Link>
                  <a
                    href="mailto:hello@naveentalenthub.in?subject=Terms%20or%20Payment%20Question"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    Email us
                  </a>
                </CardContent>
              </Card>
            </aside>
          </div>
        </SectionContainer>
      </main>

      <Footer />
    </div>
  );
}
