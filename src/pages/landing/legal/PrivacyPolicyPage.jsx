import {
  CalendarDays,
  Cookie,
  Database,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '../../../components/ui/card';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/Navbar';
import SectionContainer from '../../../components/SectionContainer';
import Seo from '../../../components/Seo';
import LegalHeaderCard from './components/LegalHeaderCard';
import LegalSectionCard from './components/LegalSectionCard';
import LegalSectionNav from './components/LegalSectionNav';

const LAST_UPDATED = 'May 13, 2026';

const QUICK_FACTS = [
  {
    icon: CalendarDays,
    title: 'Last updated',
    value: LAST_UPDATED,
    detail: 'We update this page when our services or legal requirements change.',
  },
  {
    icon: Mail,
    title: 'Privacy contact',
    value: 'hello@naveentalenthub.in',
    detail: 'Email us for access, correction, deletion, or general privacy questions.',
  },
];

const POLICY_SECTIONS = [
  {
    id: 'information-we-collect',
    icon: Database,
    eyebrow: 'Data',
    title: 'Information we collect',
    intro:
      'We collect what we need to run accounts, applications, training support, and the website-depending on how you use Naveen Talent Hub.',
    blocks: [
      {
        heading: 'What you give us',
        body:
          'Name, email, phone, city, experience, skills, resume, links (e.g. LinkedIn, GitHub), preferences, and anything you send via forms, support, or bookings.',
      },
      {
        heading: 'Automatic data',
        body:
          'Typical technical data such as browser, device, approximate location, pages viewed, and basic events that help us fix issues and improve the site.',
      },
    ],
    bullets: ['We avoid asking for sensitive data unless a specific service truly needs it.', 'Activity may include applications, sessions, and payment confirmations for paid services.'],
  },
  {
    id: 'how-we-use-information',
    icon: Sparkles,
    eyebrow: 'Use & sharing',
    title: 'How we use and share information',
    intro:
      'We use your information to deliver what you asked for, improve the product, and stay compliant. We do not sell your personal data.',
    blocks: [
      {
        heading: 'Running the platform',
        body:
          'Accounts, applications, mock interviews, mentor sessions, recruiter introductions you opt into, support replies, and service-related messages.',
      },
      {
        heading: 'Partners',
        body:
          'We use vendors for hosting, email, analytics, payments, and similar operations. When you pursue a role or session, limited profile data may go to recruiters, mentors, or interviewers involved in that step.',
      },
    ],
    bullets: ['We may use aggregated or de-identified data to improve the product.', 'We retain data only as long as needed for the purpose or as law requires.'],
  },
  {
    id: 'cookies-and-analytics',
    icon: Cookie,
    eyebrow: 'Cookies',
    title: 'Cookies and analytics',
    intro:
      'Cookies and similar tech keep logins and preferences working and help us understand traffic in aggregate.',
    blocks: [
      {
        heading: 'What we use them for',
        body:
          'Essential cookies support sign-in and core features. Analytics help us see which pages work and where people drop off.',
      },
      {
        heading: 'Your control',
        body:
          'You can limit cookies in your browser settings. Turning off some cookies may affect login persistence or parts of the site.',
      },
    ],
    bullets: ['We do not use cookies to replace a lawful basis where one is required.'],
  },
  {
    id: 'security-and-rights',
    icon: LockKeyhole,
    eyebrow: 'Safety & control',
    title: 'Security and your choices',
    intro:
      'We use reasonable safeguards. No online service is perfectly secure-please use strong passwords and protect your devices.',
    blocks: [
      {
        heading: 'Security',
        body:
          'Access is limited by role. We rely on reputable infrastructure and review practices as we grow.',
      },
      {
        heading: 'Your rights',
        body:
          'You can ask to access, correct, or delete personal data we hold, subject to legal or legitimate retention needs. We may verify identity before acting.',
      },
    ],
    bullets: ['Contact us at the email below for privacy requests.', 'You can opt out of non-essential marketing where applicable.'],
  },
  {
    id: 'contact-information',
    icon: Mail,
    eyebrow: 'Contact',
    title: 'Contact',
    intro: 'Questions or requests about this policy or your data:',
    blocks: [
      {
        heading: 'Email',
        body:
          'hello@naveentalenthub.in - use subject “Privacy Request” or “Privacy Question” and include the email or phone you used on the platform so we can help safely.',
      },
    ],
    bullets: ['We aim to respond to genuine requests within 7 business days.'],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen min-w-0 bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(99,102,241,0.16),transparent_54%),radial-gradient(ellipse_55%_40%_at_100%_12%,rgba(14,165,233,0.10),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef2ff_100%)]"
        aria-hidden
      />
      <Seo
        title="Privacy Policy | Naveen Talent Hub"
        description="Read the Privacy Policy for Naveen Talent Hub. Learn what data we collect, how we use it, cookie usage, your rights, and how to contact us for access, correction, or deletion requests."
        keywords="Naveen Talent Hub privacy policy, NTH privacy, data protection, cookie policy, user data rights, Naveen Hub privacy"
        canonicalUrl="https://naveentalenthub.in/privacy-policy"
        ogImage="https://naveentalenthub.in/hero-section/hero-image.jpg"
      />
      <Navbar />

      <main id="main-content" className="min-w-0 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32">
        <SectionContainer className="space-y-8 sm:space-y-10">
          <LegalHeaderCard
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Privacy Policy' }]}
            eyebrow="Privacy"
            eyebrowIcon={ShieldCheck}
            title={
              <>
                Privacy Policy for{' '}
                <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
                  Naveen Talent Hub
                </span>
              </>
            }
            description="Short summary of what we collect, why we use it, cookies, security, and how to reach us."
            facts={QUICK_FACTS}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
            <div className="space-y-6">
              {POLICY_SECTIONS.map((section) => (
                <LegalSectionCard key={section.id} section={section} variant="privacy" />
              ))}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
              <LegalSectionNav sections={POLICY_SECTIONS} description="Jump to a section." />

              <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-900/20">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">Privacy</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    For updates or deletion, email us with the address or phone you used on the site.
                  </p>
                  <a
                    href="mailto:hello@naveentalenthub.in?subject=Privacy%20Request"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
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
