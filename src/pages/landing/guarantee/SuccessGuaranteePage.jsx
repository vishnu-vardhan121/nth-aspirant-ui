import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Shield, Users, Star, Sparkles, MessageSquare, Calendar, FileCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PROCESS_STEPS = [
  {
    icon: MessageSquare,
    title: 'Mock with Professionals',
    description:
      'Get evaluated by industry experts from top tech companies. Our mocks simulate real pressure and technical depth to ensure you are ready for the big stage.',
    items: ['Real-time mock sessions', 'HR & Technical Interviews', 'Performance Report'],
  },
  {
    icon: Sparkles,
    title: 'Technical Support',
    description:
      'Our technical team works with you to bridge skill gaps. From architecture deep-dives to system design refinement, we ensure your technical foundation is rock solid.',
    items: ['Resume Optimization', 'System Design Prep', 'Doubt Clearing '],
  },
  {
    icon: Calendar,
    title: 'Interview Scheduling',
    description:
      'We handle the logistics. Direct connections with hiring managers mean no resume black holes. We secure interviews with companies that match your career goals.',
    items: ['Direct Manager Access', 'Multiple Slots Per Week', 'Prep Briefings'],
  },
  {
    icon: FileCheck,
    title: 'Offer Letter Assistance',
    description:
      'Landing the offer is just the start. We help you navigate negotiations and complex offer terms to ensure you get the compensation and role you deserve.',
    items: ['Salary Negotiation', 'Offer Evaluation', 'Joining Support'],
  },
];

const WHY_TRUST_NTH = [
  {
    icon: Users,
    title: 'Expert Mentors',
    desc: 'Our panel consists of mentors from FAANG and top-tier startups with over 10+ years of collective experience.',
  },
  {
    icon: Star,
    title: 'Commitment to Growth',
    desc: "We don't just find you a job; we focus on long-term career growth and skill sustainability.",
  },
  {
    icon: Shield,
    title: 'Total Transparency',
    desc: 'Clear communication, direct feedback, and a refund policy that holds us accountable to your success.',
  },
];

const FAQS = [
  {
    q: 'How does the 100% refund guarantee work?',
    a: 'If you complete the preparation milestones assigned to your specific plan (Base, Silver, or Gold) and do not receive the guaranteed interview slots or offers, we initiate a no-questions-asked full refund.',
  },
  {
    q: 'What is the duration of the interview process?',
    a: 'Typically, the end-to-end journey takes between 4 to 8 weeks. Higher tier plans like Gold offer more intensive preparation (10 mocks) and more interview slots (8), which may extend the engagement for better results.',
  },
  {
    q: 'How many interviews are guaranteed?',
    a: 'The number of direct company interviews depends on your plan: Base offers 1 (performance-based), Silver offers 2, and Gold offers up to 8 direct opportunities.',
  },
];

const GUARANTEE_ITEMS = [
  'Expert Mock Interviews',
  'Technical Support',
  'Verified Interview Slots',
  'Negotiation Assistance',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function SuccessGuarantee() {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden gradient-hero pt-32 pb-16 md:pt-40 md:pb-24">
        {/* Decorative blurs */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-5 py-2 mb-8 animate-fade-up"
          >
            <Shield size={16} className="text-primary-foreground" />
            <span className="text-white font-semibold text-sm">Guaranteed Interview Success</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 animate-fade-up [animation-delay:200ms]">
            Your Career is Our <span className="gradient-primary-text">Responsibility</span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up [animation-delay:400ms]">
            The only platform providing 360° support from mock interviews to the final offer letter. If we don't deliver results, you get a{' '}
            <strong className="text-white bg-primary/30 px-2 py-0.5 rounded">100% REFUND</strong>.
          </p>

          <div className="animate-fade-up [animation-delay:600ms]">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 !text-white font-bold px-10 py-4 rounded-full nth-shadow-lg hover:opacity-90 transition-all text-base hover:scale-105 active:scale-95 duration-200"
            >
              Secure Your Future Today
            </Link>
            <p className="text-white/40 text-sm mt-4">Backed by a 100% refund guarantee</p>
          </div>
        </div>
      </section>

      {/* ─── Why Trust NTH ─── */}
      <section className="py-12 md:py-16 section-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-up">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Why Us</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
              Why Trust <span className="text-primary">NTH</span>?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_TRUST_NTH.map((item, idx) => (
              <motion.div
                key={item.title}
                custom={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="nth-card p-8 flex flex-col items-start gap-4 hover:nth-shadow transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex w-full justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white nth-shadow">
                    <item.icon size={22} />
                  </div>
                  <span className="text-6xl font-black text-primary/10 select-none leading-none">0{idx + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Process Steps ─── */}
      <section className="py-12 md:py-16 section-muted">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-in">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">Our Process</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2 mb-4">
              Our <span className="text-primary">Methodology</span>
            </h2>
            <p className="text-slate-600 text-lg">
              We've refined a process that eliminates luck and replaces it with structured, high-intensity preparation and direct advocacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PROCESS_STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                custom={index}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="nth-card overflow-hidden hover:nth-shadow transition-all duration-300 group"
              >
                <div className="h-2 bg-primary transition-all duration-500 group-hover:h-3" />

                <div className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <step.icon size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Step 0{index + 1}</span>
                      <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-relaxed mb-5">{step.description}</p>

                  <ul className="space-y-2">
                    {step.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check size={16} className="text-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Refund Guarantee ─── */}
      <section className="py-12 md:py-16 section-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl gradient-hero p-10 md:p-16 border border-white/10"
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/5 blur-xl animate-pulse" />

            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
                  <Shield size={14} className="text-white" />
                  <span className="text-white font-semibold text-xs uppercase tracking-wider">No risk commitment</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  The Absolute <span className="gradient-primary-text">Refund Guarantee</span>
                </h2>
                <p className="text-white/70 leading-relaxed">
                  If we fail to provide the promised interview opportunities or offer guidance after you complete our preparation milestones, you are entitled to a full refund.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {GUARANTEE_ITEMS.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-white" />
                      </div>
                      <span className="text-white/90 text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-6">
                  <p className="text-white/60 text-sm italic leading-relaxed">
                    "Your professional success is our only KPI. We share the risk because we believe in our process."
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-12 md:py-16 section-muted">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14 animate-fade-in">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq) => (
              <motion.details
                key={faq.q}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="nth-card group"
              >
                <summary className="cursor-pointer p-6 font-bold text-slate-900 flex items-center justify-between list-none">
                  {faq.q}
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed -mt-2 animate-accordion-down">{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ─── */}
      <section className="relative overflow-hidden bg-slate-950 py-20 md:py-24 text-white">
        <div className="absolute top-10 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 rounded-full bg-primary/5 blur-2xl" />

        <div className="container mx-auto px-4 relative z-10 text-center animate-fade-up">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            Don't Leave Your Career
            <br />
            to Chance.
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-10">
            Join the elite circle of aspirants who are already interviewing with the world's best companies.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 !text-white font-bold px-10 py-4 rounded-full nth-shadow-lg hover:opacity-90 transition-all text-base hover:scale-105 active:scale-95 duration-200"
          >
            Apply for Membership
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
