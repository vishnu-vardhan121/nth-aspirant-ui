import React from 'react';
import { motion } from 'framer-motion';

const PROJECTS = [
  { title: "Automotive Motion", colSpan: "md:col-span-7", img: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1200&h=800" },
  { title: "Urban Architecture", colSpan: "md:col-span-5", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000&h=800" },
  { title: "Human Perspective", colSpan: "md:col-span-5", img: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=1000&h=800" },
  { title: "Brand Identity", colSpan: "md:col-span-7", img: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&q=80&w=1200&h=800" }
];

export default function SelectedWorksSection() {
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] } 
    }
  };

  return (
    <section id="work" className="bg-bg py-16 md:py-24 relative z-20">
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
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Selected Work</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-text-primary mb-6">
              Featured <span className="font-display italic text-text-primary/90">projects</span>
            </h2>
            
            <p className="text-muted text-base">
              A selection of projects I've worked on, from concept to launch. Designing seamless digital interactions by focusing on the unique nuances which bring systems to life.
            </p>
          </div>
          
          <button className="hidden md:inline-flex group relative rounded-full border border-stroke bg-bg py-3 px-6 text-sm hover:border-transparent transition-colors overflow-hidden shrink-0 items-center gap-2">
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 animate-gradient-shift" />
            <div className="absolute inset-[1px] bg-bg rounded-full" />
            <span className="relative z-10 text-text-primary flex items-center gap-2">
              View all work <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {PROJECTS.map((project, idx) => (
            <motion.div
              key={project.title}
              className={`${project.colSpan} group relative bg-surface border border-stroke rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-video md:aspect-[4/3] lg:aspect-video cursor-pointer transform-gpu`}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { 
                  opacity: 1, 
                  y: 0,
                  transition: { duration: 1, delay: idx * 0.1, ease: [0.25, 0.1, 0.25, 1] } 
                }
              }}
            >
              <img 
                src={project.img} 
                alt={project.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Halftone Overlay */}
              <div 
                className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                  backgroundSize: '4px 4px'
                }}
              />
              
              {/* Dark Hover Overlay */}
              <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-sm pointer-events-none flex items-center justify-center">
                {/* Pill Label */}
                <div className="translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 ease-[cubic-bezier(0.25,0.1,0.25,1)]">
                  <div className="relative inline-flex overflow-hidden rounded-full p-[2px]">
                    <span className="absolute inset-0 accent-gradient animate-gradient-shift" />
                    <div className="relative bg-[#ffffff] h-full w-full rounded-full px-5 py-2 whitespace-nowrap">
                      <span className="text-bg font-medium text-sm">
                        View — <span className="font-display italic">{project.title}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Mobile only View All */}
        <div className="mt-12 md:hidden flex justify-center">
          <button className="group relative rounded-full border border-stroke bg-bg py-3 px-6 text-sm text-text-primary overflow-hidden">
            View all work
          </button>
        </div>
        
      </div>
    </section>
  );
}
