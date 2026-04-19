import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PHOTOS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=400&h=400"
];

export default function ExplorationsSection() {
  const containerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const colLeftRef = useRef<HTMLDivElement>(null);
  const colRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Pin the center title block
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false
      });

      // 2. Parallax effect for left column
      gsap.fromTo(colLeftRef.current, 
        { yPercent: 10 },
        {
          yPercent: -40,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1
          }
        }
      );

      // 3. Parallax effect for right column (moves inverse/different speed)
      gsap.fromTo(colRightRef.current,
        { yPercent: -20 },
        {
          yPercent: 30,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5
          }
        }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="bg-bg min-h-[300vh] relative z-20 overflow-hidden">
      
      {/* Pinned Layer (z-10) */}
      <div 
        ref={contentRef} 
        className="h-screen w-full flex flex-col items-center justify-center pointer-events-none z-10 absolute top-0 left-0"
      >
        <div className="text-center px-4 mix-blend-difference z-30">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-8 h-px bg-white/50" />
            <span className="text-xs text-white/70 uppercase tracking-[0.3em]">Explorations</span>
            <div className="w-8 h-px bg-white/50" />
          </div>
          
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-6 drop-shadow-lg">
            Visual <span className="font-display italic text-white/90">playground</span>
          </h2>
          
          <p className="text-white/80 text-base md:text-lg max-w-md mx-auto mb-10 drop-shadow-md">
            A sandbox for visual experiments, motion design, and creative coding. Where ideas take shape without boundaries.
          </p>
          
          <button className="pointer-events-auto group relative rounded-full border border-white/20 bg-white/10 backdrop-blur-md py-3 px-8 text-sm hover:border-transparent transition-colors overflow-hidden">
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 animate-gradient-shift" />
            <div className="absolute inset-[1px] bg-black/80 rounded-full" />
            <span className="relative z-10 text-white flex items-center gap-2">
              View on Dribbble <span className="transform group-hover:translate-x-1 transition-transform">↗</span>
            </span>
          </button>
        </div>
      </div>

      {/* Parallax Columns Layer (z-20) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden mix-blend-luminosity opacity-40 hover:opacity-100 transition-opacity duration-700">
        <div className="max-w-[1400px] mx-auto h-full grid grid-cols-2 gap-12 md:gap-40 px-4 md:px-16 pt-[20vh]">
          
          {/* Left Column */}
          <div ref={colLeftRef} className="flex flex-col gap-12 sm:gap-24 items-end pointer-events-auto">
            {PHOTOS.slice(0, 3).map((img, i) => (
              <div 
                key={i} 
                className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden cursor-pointer group hover:rotate-2 hover:scale-105 transition-all duration-500 shadow-2xl border border-white/10"
              >
                <img src={img} alt={`Exploration ${i}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-110" />
              </div>
            ))}
          </div>
          
          {/* Right Column */}
          <div ref={colRightRef} className="flex flex-col gap-16 sm:gap-32 items-start pt-[30vh] pointer-events-auto">
            {PHOTOS.slice(3, 6).map((img, i) => (
              <div 
                key={i} 
                className="w-full max-w-[320px] aspect-square rounded-3xl overflow-hidden cursor-pointer group hover:-rotate-2 hover:scale-105 transition-all duration-500 shadow-2xl border border-white/10"
              >
                <img src={img} alt={`Exploration ${i + 3}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-110" />
              </div>
            ))}
          </div>

        </div>
      </div>

    </section>
  );
}
