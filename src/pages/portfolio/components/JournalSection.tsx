import React from 'react';
import { motion } from 'framer-motion';

const ENTRIES = [
  { title: "The illusion of perfection in design", date: "Oct 12, 2025", read: "4 min read", img: "https://images.unsplash.com/photo-1541462608143-67571c6738dd?auto=format&fit=crop&q=80&w=200&h=200" },
  { title: "Building accessible web experiences", date: "Sep 28, 2025", read: "6 min read", img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=200&h=200" },
  { title: "My transition from Figma to Code", date: "Aug 15, 2025", read: "8 min read", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=200&h=200" },
  { title: "Typography matters: A micro-study", date: "Jul 02, 2025", read: "3 min read", img: "https://images.unsplash.com/photo-1510127034890-ba27e0843171?auto=format&fit=crop&q=80&w=200&h=200" }
];

export default function JournalSection() {
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] } }
  };

  return (
    <section id="journal" className="bg-bg py-16 md:py-24 relative z-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        
        {/* Header */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <div className="max-w-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Journal</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-text-primary mb-6">
              Recent <span className="font-display italic text-text-primary/90">thoughts</span>
            </h2>
            
            <p className="text-muted text-base">
              A collection of writings on design, engineering, and the creative process. Sharing the journey and lessons learned along the way.
            </p>
          </div>
          
          <button className="hidden md:inline-flex group relative rounded-full border border-stroke bg-bg py-3 px-6 text-sm hover:border-transparent transition-colors overflow-hidden shrink-0 items-center gap-2">
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 animate-gradient-shift" />
            <div className="absolute inset-[1px] bg-bg rounded-full" />
            <span className="relative z-10 text-text-primary flex items-center gap-2">
              View all entries <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </motion.div>

        {/* Entries List */}
        <div className="flex flex-col gap-4">
          {ENTRIES.map((entry, idx) => (
            <motion.a 
              key={idx}
              href="#"
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-4 bg-surface/30 hover:bg-surface border border-stroke rounded-[40px] sm:rounded-full transition-colors duration-300 relative overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
            >
              {/* Hover Effect Background */}
              <div className="absolute inset-0 bg-stroke/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              {/* Left Side: Img + Title */}
              <div className="flex items-center gap-4 sm:gap-6 z-10 w-full">
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full overflow-hidden border border-stroke shadow-lg">
                  <img 
                    src={entry.img} 
                    alt={entry.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out grayscale group-hover:grayscale-0"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-text-primary group-hover:text-white transition-colors">
                  {entry.title}
                </h3>
              </div>
              
              {/* Right Side: Meta */}
              <div className="flex items-center gap-4 sm:gap-8 px-4 sm:px-6 w-full sm:w-auto justify-between sm:justify-end shrink-0 z-10">
                <div className="flex flex-col sm:items-end gap-1">
                  <span className="text-sm text-text-primary">{entry.date}</span>
                  <span className="text-xs text-muted font-mono">{entry.read}</span>
                </div>
                <div className="w-10 h-10 rounded-full border border-stroke flex items-center justify-center group-hover:bg-text-primary group-hover:text-bg transition-colors shrink-0">
                  <span className="transform -rotate-45 group-hover:rotate-0 transition-transform duration-300">→</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
        
      </div>
    </section>
  );
}
