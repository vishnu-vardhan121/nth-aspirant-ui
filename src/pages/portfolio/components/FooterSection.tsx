import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import gsap from 'gsap';

export default function FooterSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

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

  // Marquee GSAP
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(marqueeRef.current, {
        xPercent: -50,
        repeat: -1,
        duration: 40,
        ease: "none"
      });
    });
    return () => ctx.revert();
  }, []);

  const marqueeText = Array(10).fill("BUILDING THE FUTURE • ").join("");

  return (
    <footer id="resume" className="relative bg-bg pt-16 md:pt-32 pb-8 md:pb-12 overflow-hidden border-t border-stroke min-h-[500px] flex flex-col justify-end">
      
      {/* Flipped Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 w-full h-full object-cover min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 scale-y-[-1]"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
        
        {/* GSAP Marquee */}
        <div className="w-full overflow-hidden mb-16 select-none opacity-80 mix-blend-plus-lighter">
          <div ref={marqueeRef} className="whitespace-nowrap flex w-[200%]">
            <h2 className="text-[10vw] font-display italic tracking-widest text-text-primary/10">
              {marqueeText}
            </h2>
            <h2 className="text-[10vw] font-display italic tracking-widest text-text-primary/10 absolute left-1/2">
              {marqueeText}
            </h2>
          </div>
        </div>

        {/* Call To Action */}
        <div className="text-center mb-24 px-4 mix-blend-difference">
          <p className="text-muted text-sm uppercase tracking-[0.3em] mb-6">Start a project</p>
          <a href="mailto:hello@michaelsmith.com" className="group relative inline-flex rounded-full text-base md:text-lg px-10 py-5 transition-all hover:scale-105 border border-stroke bg-bg/50 backdrop-blur-md hover:border-transparent overflow-hidden shadow-2xl">
            <span className="absolute inset-[-2px] accent-gradient opacity-0 group-hover:opacity-100 animate-gradient-shift" />
            <div className="absolute inset-[2px] bg-bg rounded-full transition-colors" />
            <span className="relative z-10 text-text-primary font-medium flex items-center gap-2">
              hello@michaelsmith.com <span className="transform group-hover:translate-x-1 -rotate-45 transition-transform duration-300">→</span>
            </span>
          </a>
        </div>

        {/* Footer Bar */}
        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/10 mix-blend-difference">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <span className="text-sm text-text-primary">Available for projects</span>
          </div>

          <div className="flex items-center gap-6">
            {['Twitter', 'LinkedIn', 'Dribbble', 'GitHub'].map(platform => (
              <a key={platform} href="#" className="text-sm text-muted hover:text-text-primary transition-colors">
                {platform}
              </a>
            ))}
          </div>

          <div className="text-xs text-muted flex items-center gap-2">
            © {new Date().getFullYear()} Michael Smith. 
            <button className="hover:text-text-primary transition-colors ml-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Back to top ↗
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
