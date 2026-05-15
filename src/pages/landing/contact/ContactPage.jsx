import { createElement } from 'react';
import { Clock, Mail, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/Navbar';
import SectionContainer from '../../../components/SectionContainer';
import Seo from '../../../components/Seo';
import { Card, CardContent } from '../../../components/ui/card';
import LegalHeaderCard from '../legal/components/LegalHeaderCard';
import HelpDeskForm from '../home/components/HelpDeskForm';

const HELLO_EMAIL = 'hello@naveentalenthub.in';
const SUPPORT_EMAIL = 'support@naveentalenthub.in';
const REGISTERED_ADDRESS =
  'Rd Number 2, Street Number 2, Kukatpally Housing Board Colony, K P H B Phase 1, Kukatpally, Hyderabad, Telangana 500072';

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: 'General enquiries',
    value: HELLO_EMAIL,
    detail: 'Accounts, partnerships, and platform questions.',
    href: `mailto:${HELLO_EMAIL}?subject=General%20enquiry`,
    tone: 'indigo',
  },
  {
    icon: MessageCircle,
    title: 'Refunds & billing',
    value: SUPPORT_EMAIL,
    detail: 'Payments, cancellations, reschedules, and refund requests.',
    href: `mailto:${SUPPORT_EMAIL}?subject=Payment%20or%20refund%20question`,
    tone: 'violet',
  },
  {
    icon: Clock,
    title: 'Response time',
    value: '1–3 business days',
    detail: 'We aim to respond within 1–3 business days. Weekends and public holidays may take longer.',
    tone: 'sky',
  },
];

const TONE_STYLES = {
  indigo: {
    card: 'border-indigo-200/80 bg-linear-to-br from-indigo-50/90 via-white to-white',
    icon: 'bg-indigo-100 text-indigo-700 ring-indigo-200/80',
    bar: 'from-indigo-600 via-violet-500 to-indigo-400',
  },
  violet: {
    card: 'border-violet-200/80 bg-linear-to-br from-violet-50/90 via-white to-white',
    icon: 'bg-violet-100 text-violet-700 ring-violet-200/80',
    bar: 'from-violet-600 via-purple-500 to-violet-400',
  },
  sky: {
    card: 'border-sky-200/80 bg-linear-to-br from-sky-50/90 via-white to-white',
    icon: 'bg-sky-100 text-sky-800 ring-sky-200/80',
    bar: 'from-sky-600 via-cyan-500 to-sky-400',
  },
};

function ContactChannelCard({ channel }) {
  const tone = TONE_STYLES[channel.tone] ?? TONE_STYLES.indigo;
  const body = (
    <Card
      className={`group overflow-hidden rounded-2xl border shadow-md shadow-slate-900/6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-950/10 ${tone.card}`}
    >
      <div className={`h-1 w-full bg-linear-to-r ${tone.bar}`} aria-hidden />
      <CardContent className="space-y-3 p-5">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105 ${tone.icon}`}
        >
          {createElement(channel.icon, { className: 'h-5 w-5', 'aria-hidden': true })}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{channel.title}</p>
        <p className="text-sm font-semibold leading-snug text-slate-900 break-all">{channel.value}</p>
        {channel.detail ? <p className="text-sm leading-relaxed text-slate-600">{channel.detail}</p> : null}
      </CardContent>
    </Card>
  );

  if (channel.href) {
    return (
      <a
        href={channel.href}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {body}
      </a>
    );
  }

  return body;
}

export default function ContactPage() {
  return (
    <div className="min-h-screen min-w-0 bg-slate-100/80">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(ellipse_50%_45%_at_0%_80%,rgba(14,165,233,0.12),transparent_50%),radial-gradient(ellipse_45%_40%_at_100%_70%,rgba(139,92,246,0.14),transparent_50%),linear-gradient(180deg,#e2e8f0_0%,#f1f5f9_35%,#eef2ff_100%)]"
        aria-hidden
      />
      <Seo
        title="Contact Us | Naveen Talent Hub"
        description="Contact Naveen Talent Hub for mock interview bookings, pricing enquiries, refunds, billing, or general questions. Email hello@naveentalenthub.in or use our contact form. Response within 1–3 business days."
        keywords="contact Naveen Talent Hub, contact NTH, Naveen Hub contact, mock interview support, career support contact India, Hyderabad career platform, NTH Hyderabad"
        canonicalUrl="https://naveentalenthub.in/contact"
        ogImage="https://naveentalenthub.in/hero-section/hero-image.jpg"
      />
      <Navbar />

      <main id="main-content" className="min-w-0 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32">
        <SectionContainer className="space-y-8 sm:space-y-10">
          <LegalHeaderCard
            breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
            eyebrow="Get in touch"
            eyebrowIcon={ShieldCheck}
            title={
              <>
                Contact{' '}
                <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
                  Naveen Talent Hub
                </span>
              </>
            }
            description="Questions about mock interviews, mentorship, pricing, or your account? Send a message below or email us directly."
            facts={[
              {
                icon: Mail,
                title: 'Email',
                value: HELLO_EMAIL,
                detail: 'General questions and partnerships.',
              },
              {
                icon: MessageCircle,
                title: 'Billing',
                value: SUPPORT_EMAIL,
                detail: 'Refunds, payments, and cancellations.',
              },
              {
                icon: MapPin,
                title: 'Location',
                value: REGISTERED_ADDRESS,
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
            <Card className="overflow-hidden rounded-[1.75rem] border border-indigo-200/70 bg-linear-to-br from-white via-indigo-50/30 to-violet-50/25 shadow-xl shadow-indigo-950/10 ring-1 ring-white/90">
              <div className="h-1.5 w-full bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500" aria-hidden />
              <CardContent className="p-5 sm:p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Send a message</p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      Help desk enquiry
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                      Same form as in-app help desk. Choose billing or payment for refund-related topics.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 shadow-inner shadow-slate-900/5 sm:p-6 md:bg-slate-100/60">
                  <HelpDeskForm
                    variant="light"
                    source="contact_page"
                    submitLabel="Send message"
                    idPrefix="contact"
                  />
                </div>
              </CardContent>
            </Card>

            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              {CONTACT_CHANNELS.map((channel) => (
                <ContactChannelCard key={channel.title} channel={channel} />
              ))}

              <Card className="overflow-hidden rounded-2xl border border-indigo-900/40 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl shadow-slate-900/25">
                <div className="h-1 w-full bg-linear-to-r from-indigo-400 via-violet-400 to-sky-400" aria-hidden />
                <CardContent className="space-y-3 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Policies</p>
                  <p className="text-sm leading-relaxed text-slate-300">
                    Paid services are described on our pricing and refund pages-not hiring guarantees.
                  </p>
                  <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                    <Link
                      to="/refund-policy"
                      className="text-sm font-medium text-indigo-200 underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      Refund & Cancellation Policy
                    </Link>
                    <Link
                      to="/terms-and-conditions"
                      className="text-sm font-medium text-indigo-200 underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      Terms & Conditions
                    </Link>
                    <Link
                      to="/pricing"
                      className="text-sm font-medium text-indigo-200 underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      View pricing
                    </Link>
                  </div>
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
