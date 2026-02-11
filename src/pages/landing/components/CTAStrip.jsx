import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SectionContainer from '../../../components/SectionContainer';

export default function CTAStrip() {
  return (
    <section className="relative py-20 sm:py-24 overflow-hidden bg-white">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-100 rounded-full blur-[80px]" />
      </div>

      <SectionContainer>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[rgb(var(--nth-text-primary-light))] mb-6 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Ready to fast-track your career?
          </motion.h2>
          <motion.p
            className="text-lg sm:text-xl text-[rgb(var(--nth-text-secondary-light))] mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Join thousands of aspirants connecting with top recruiters today.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              to="/pricing"
              className="nth-btn-primary inline-flex items-center justify-center px-8 py-4 text-lg font-bold group hover:text-white"
            >
              Get Started Now
            </Link>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
