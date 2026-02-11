import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SectionContainer from '../../../components/SectionContainer';

export default function CTAStrip() {
  return (
    <section className="relative bg-slate-50 py-12 sm:py-16 md:py-20">
      <SectionContainer useGrid>
        <div className="col-span-full max-w-3xl mx-auto text-center">
          <motion.p
            className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Ready to grow? Get started today.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link to="/pricing" className="nth-btn-primary inline-flex items-center justify-center text-base sm:text-lg">
              Get started
            </Link>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  );
}
