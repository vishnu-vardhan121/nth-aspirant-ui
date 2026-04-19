import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';

const ROLES = ["Creative", "Fullstack", "Founder", "Scholar"];

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Initialize HLS Video
  useEffect(() => {
    const videoSrc = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
    }
  }, []);

  // Role cycler
  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex(curr => (curr + 1) % ROLES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // GSAP Entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to('.name-reveal', {
        opacity: 1,
        y: 0,
        duration: 1.2,
        delay: 0.1,
        ease: "power3.out"
      }, 0);
      
      tl.to('.blur-in', {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 1,
        stagger: 0.1,
        delay: 0.3,
        ease: "power3.out"
      }, 0);
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  // Scroll listener for Navbar
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={containerRef} className="relative w-full h-screen overflow-hidden bg-bg">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 w-full h-full object-cover min-w-full min-h-full -translate-x-1/2 -translate-y-1/2"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Navbar Fixed */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4 pointer-events-none">
        <div 
          className={`pointer-events-auto inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-shadow duration-300 ${
            scrollY > 100 ? 'shadow-md shadow-black/30' : ''
          }`}
        >
          {/* Logo */}
          <div className="group relative w-9 h-9 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shrink-0">
            <div className="absolute inset-0 rounded-full accent-gradient animate-gradient-shift group-hover:[animation-direction:reverse]" />
            <div className="absolute inset-[2px] bg-bg rounded-full flex items-center justify-center">
              <span className="font-display italic text-[13px] text-text-primary leading-none mt-0.5">JA</span>
            </div>
          </div>
          
          <div className="hidden md:block w-px h-5 bg-stroke mx-3" />
          
          {/* Nav Links */}
          <div className="flex items-center space-x-1 sm:space-x-2 mx-2">
            {['Home', 'Work', 'Resume'].map((item, i) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-colors ${
                  i === 0 ? 'text-text-primary bg-stroke/50' : 'text-muted hover:text-text-primary hover:bg-stroke/50'
                }`}
              >
                {item}
              </a>
            ))}
          </div>
          
          <div className="w-px h-5 bg-stroke mx-2 sm:mx-3" />
          
          {/* Say Hi Button */}
          <button className="group relative text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-text-primary overflow-hidden">
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 transition-opacity animate-gradient-shift" />
            <div className="absolute inset-[1px] bg-surface rounded-full backdrop-blur-md transition-colors group-hover:bg-surface/80" />
            <span className="relative z-10 flex items-center gap-1.5">
              Say hi <span className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6 text-center pt-20">
        <p 
          className="blur-in text-xs text-muted uppercase tracking-[0.3em] mb-8"
          style={{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }}
        >
          Collection '26
        </p>
        
        <h1 
          className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6"
          style={{ opacity: 0, transform: 'translateY(50px)' }}
        >
          Michael Smith
        </h1>
        
        <p 
          className="blur-in text-xl md:text-3xl text-muted font-light mb-8 h-[40px] flex items-center justify-center gap-2"
          style={{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }}
        >
          A <span key={roleIndex} className="font-display italic text-text-primary animate-role-fade-in inline-block min-w-[120px] text-left">
            {ROLES[roleIndex]}
          </span> lives in Chicago.
        </p>
        
        <p 
          className="blur-in text-sm md:text-base text-muted max-w-md mx-auto mb-12"
          style={{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }}
        >
          Designing seamless digital interactions by focusing on the unique nuances which bring systems to life.
        </p>
        
        <div className="blur-in flex items-center gap-4" style={{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }}>
          <button className="group relative rounded-full text-sm px-7 py-3.5 transition-all hover:scale-105 overflow-hidden">
            <span className="absolute inset-0 bg-text-primary group-hover:opacity-0 transition-opacity" />
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 animate-gradient-shift" />
            <div className="absolute inset-[2px] bg-bg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 text-bg group-hover:text-text-primary transition-colors font-medium">
              See Works
            </span>
          </button>
          
          <button className="group relative rounded-full text-sm px-7 py-3.5 transition-all hover:scale-105 border-2 border-stroke bg-bg hover:border-transparent overflow-hidden">
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 animate-gradient-shift" />
            <div className="absolute inset-[2px] bg-bg rounded-full transition-colors" />
            <span className="relative z-10 text-text-primary font-medium">
              Reach out...
            </span>
          </button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">Scroll</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-text-primary animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
