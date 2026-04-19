import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WORDS = ["Design", "Create", "Inspire"];
const TOTAL_DURATION = 2700; // 2.7s
const WORD_DURATION = 900; // 900ms per word

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    const animate = (time: number) => {
      if (startTimeRef.current === undefined) {
        startTimeRef.current = time;
      }
      const elapsed = time - startTimeRef.current;
      
      // Calculate count (0 to 100)
      const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setCount(Math.floor(progress));
      
      // Calculate word cycle
      const currentWordIndex = Math.min(
        Math.floor(elapsed / WORD_DURATION), 
        WORDS.length - 1
      );
      setWordIndex(currentWordIndex);

      if (elapsed < TOTAL_DURATION) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setCount(100);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            onComplete();
          }, 600); // Wait for fade out
        }, 400); // Delay before completing
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFadingOut && (
        <motion.div 
          className="fixed inset-0 z-[9999] bg-bg flex flex-col justify-between"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Top-left: Portfolio Label */}
          <div className="pt-8 px-8 md:px-12">
            <motion.div 
              className="text-xs text-muted uppercase tracking-[0.3em]"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Portfolio
            </motion.div>
          </div>

          {/* Center: Rotating Words */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative h-[80px] md:h-[120px] flex items-center justify-center overflow-hidden w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={wordIndex}
                  className="text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary/80 absolute"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {WORDS[wordIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Area */}
          <div className="pb-8 px-8 md:px-12 flex flex-col gap-6">
            <div className="flex justify-end">
              {/* Counter Display */}
              <div className="text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums leading-none">
                {String(count).padStart(3, "0")}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-[3px] bg-stroke/50 rounded-full overflow-hidden">
              <div 
                className="h-full accent-gradient origin-left transition-transform duration-75 ease-linear"
                style={{ 
                  transform: `scaleX(${count / 100})`,
                  boxShadow: '0 0 8px rgba(137, 170, 204, 0.35)'
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
