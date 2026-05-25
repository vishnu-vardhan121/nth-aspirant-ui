import { Compass, Layers, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/Navbar';
import SectionContainer from '../../../components/SectionContainer';
import Seo from '../../../components/Seo';
import { Card, CardContent } from '../../../components/ui/card';
import LegalHeaderCard from '../legal/components/LegalHeaderCard';
import LegalSectionCard from '../legal/components/LegalSectionCard';
import LegalSectionNav from '../legal/components/LegalSectionNav';

const HELLO_EMAIL = 'hello@naveentalenthub.in';
const REGISTERED_ADDRESS =
  'Rd Number 2, Street Number 2, Kukatpally Housing Board Colony, K P H B Phase 1, Kukatpally, Hyderabad, Telangana 500072';

const ABOUT_SECTIONS = [
  {
    id: 'what-we-do',
    icon: Layers,
    eyebrow: 'Mission',
    title: 'What we do',
    intro:
      'Naveen Talent Hub helps students and professionals prepare better for career opportunities through resume support, mock interviews, profile review, communication coaching, and interview preparation guidance.',
    blocks: [
      {
        heading: 'Freshers and experienced',
        body:
          'We work with both freshers entering the industry and experienced professionals looking to move up or switch roles. Our plans are designed to match where you are in your journey.',
      },
    ],
    bullets: [],
  },
  {
    id: 'our-approach',
    icon: Compass,
    eyebrow: 'Philosophy',
    title: 'Our approach',
    intro:
      'We do not promise jobs, interviews, selections, salaries, or offer letters. We focus on preparation, honest feedback, and professional guidance so you can pursue opportunities independently with more confidence.',
    blocks: [],
    bullets: [],
  },
  {
    id: 'based-in',
    icon: MapPin,
    eyebrow: 'Location',
    title: 'Based in',
    intro: 'Hyderabad, Telangana, India',
    blocks: [
      {
        heading: 'Address',
        body: REGISTERED_ADDRESS,
      },
      {
        heading: 'Email',
        body: HELLO_EMAIL,
      },
    ],
    bullets: [],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen min-w-0 bg-slate-50">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(99,102,241,0.16),transparent_54%),radial-gradient(ellipse_55%_40%_at_100%_12%,rgba(14,165,233,0.08),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef2ff_100%)]"
        aria-hidden
      />
      <Seo
        title="About Us | Naveen Talent Hub"
        description="Learn about Naveen Talent Hub—resume support, mock interview practice, profile review, communication coaching, and interview preparation guidance in India. Based in Hyderabad."
        keywords="about Naveen Talent Hub, about NTH, Naveen Hub, tech career India, Hyderabad interview coaching"
        canonicalUrl="https://naveentalenthub.in/about"
        ogImage="https://naveentalenthub.in/hero-section/hero-image.webp"
      />
      <Navbar />

      <main id="main-content" className="min-w-0 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32">
        <SectionContainer className="space-y-8 sm:space-y-10">
          <LegalHeaderCard
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
            eyebrow="About us"
            eyebrowIcon={ShieldCheck}
            title={
              <>
                About{' '}
                <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
                  Naveen Talent Hub
                </span>
              </>
            }
            description="We help students and professionals build interview readiness through structured career support—not recruitment or placement services."
            facts={[
              {
                icon: Mail,
                title: 'Email',
                value: HELLO_EMAIL,
                detail: 'General enquiries.',
              },
              {
                icon: MapPin,
                title: 'Based in',
                value: 'Hyderabad, Telangana, India',
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
            <div className="space-y-6">
              {ABOUT_SECTIONS.map((section) => (
                <LegalSectionCard key={section.id} section={section} variant="privacy" />
              ))}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
              <LegalSectionNav sections={ABOUT_SECTIONS} description="Jump to a section." />

              <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/80 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-900/20">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">Contact</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Questions about plans or how we work? Email us anytime.
                  </p>
                  <a
                    href={`mailto:${HELLO_EMAIL}?subject=About%20Naveen%20Talent%20Hub`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    Email us
                  </a>
                  <Link to="/contact" className="mt-3 block text-center text-xs text-indigo-200 underline-offset-2 hover:text-white hover:underline">
                    Contact form
                  </Link>
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
