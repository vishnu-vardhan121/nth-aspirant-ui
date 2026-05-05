import React from 'react';
import { motion } from 'framer-motion';

const STATS = [
  { value: "10+", label: "Years Experience" },
  { value: "95+", label: "Projects Done" },
  { value: "200%", label: "Satisfied Clients" } // User prompt literally says "200% Satisfied Clients"
];

export default function StatsSection() {
  return (
    <section className="bg-bg py-16 md:py-24 relative z-20 border-t border-stroke">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-stroke">
          {STATS.map((stat, idx) => (
            <motion.div 
              key={idx} 
              className="flex flex-col items-center justify-center text-center pt-8 md:pt-0 first:pt-0"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: idx * 0.2, ease: "easeOut" }}
            >
              <h3 className="text-6xl lg:text-7xl font-display text-text-primary mb-2">
                {stat.value}
              </h3>
              <p className="text-sm text-muted uppercase tracking-[0.2em]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
