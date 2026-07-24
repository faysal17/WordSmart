import React, { useState, useEffect } from 'react';
import { X, Flame, Sparkles, Lock, Cloud, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HelpGuideModal({ isOpen, onClose }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const tooltipRef = React.useRef(null);
  const [tooltipHeight, setTooltipHeight] = useState(380);

  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;
    
    const updateHeight = () => {
      if (tooltipRef.current) {
        setTooltipHeight(tooltipRef.current.offsetHeight);
      }
    };
    
    updateHeight();
    const timeoutId = setTimeout(updateHeight, 50);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(tooltipRef.current);
      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen, slideIndex]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slides = [
    {
      targetId: "tour-metrics",
      title: "Learning Metrics & Streak Tracker",
      description: "Located in the left column, this panel tracks your overall progress and memory retention health.",
      icon: Flame,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      bullets: [
        { label: "Streak Tracker", desc: "Tracks consecutive daily study sessions. A card is officially 'Mastered' once its scheduled review interval reaches 21+ days." },
        { label: "Card Status Filters", desc: "Toggle between Due (scheduled reviews for today), New (unlearned words), or All (entire active set)." },
        { label: "Forgetting Curve Graph", desc: "An SVG retention curve that simulates your memory decay rate over a 7-day projection timeline using the SM-2 algorithm." }
      ]
    },
    {
      targetId: "tour-flashcard",
      title: "Recall Flashcards & SM-2 Engine",
      description: "At the center of your screen is the interactive vocabulary flashcard deck.",
      icon: Sparkles,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      bullets: [
        { label: "Queue Navigation", desc: "Select and move through the circular numbers to skip or jump between cards in your current queue." },
        { label: "Flip to Reveal", desc: "Click the card to flip it and reveal its pronunciation guide, definition box, and historical stats." },
        { label: "Recall Grading", desc: "Rate your recall (Hard, Good, Easy) to schedule review intervals. Correct answers double the time gap, while Hard resets progression." }
      ]
    },
    {
      targetId: "tour-chunks",
      title: "Chunk Selector & Mastery Locks",
      description: "The right column manages the vocabulary chunks included in your learning path.",
      icon: Lock,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      bullets: [
        { label: "Active Chunk List", desc: "Manually check or uncheck individual chunks to add or remove their words from study sessions." },
        { label: "Mastery Progression", desc: "Chunks 1 to 10 are unlocked by default. Chunk 11 unlocks at 70 mastered cards, Chunk 12 at 80, and so on (+10 per chunk)." },
        { label: "Hover Indicators", desc: "Locked chunks show lock icons. Hovering over a lock displays a tooltip showing how many mastered cards are needed." }
      ]
    },
    {
      targetId: "tour-sync",
      title: "Cloud History Syncing",
      description: "WordSmart supports seamless progress syncing to protect your database history.",
      icon: Cloud,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      bullets: [
        { label: "Local Cache", desc: "All card review updates are saved instantly in local storage, allowing offline study." },
        { label: "Supabase Cloud Sync", desc: "Click 'Sign In / Sync Cloud' to link your account. This syncs your reviews, status mappings, and streaks to the cloud." },
        { label: "Multi-Device Coverage", desc: "Allows studying from any desktop, tablet, or phone while keeping progress aligned." }
      ]
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setSlideIndex(0);
      setSpotlightRect(null);
      return;
    }

    const updateRect = () => {
      const currentSlide = slides[slideIndex];
      const element = document.getElementById(currentSlide.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setSpotlightRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        // Ensure target is scrolled into view (especially for stacked mobile layouts)
        const isOffscreen =
          rect.top < 0 ||
          rect.bottom > window.innerHeight ||
          rect.left < 0 ||
          rect.right > window.innerWidth;
        if (isOffscreen) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setSpotlightRect(null);
      }
    };

    updateRect();
    // Schedule a small delay to catch DOM rendering changes or layout animations
    const timeoutId = setTimeout(updateRect, 100);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isOpen, slideIndex, windowWidth]);

  if (!isOpen) return null;

  const currentSlide = slides[slideIndex];
  const SlideIcon = currentSlide.icon;

  const handleNext = () => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex(slideIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
    }
  };

  // Determine Tooltip CSS styling dynamically
  const getTooltipStyle = () => {
    if (!spotlightRect || windowWidth < 1024) return {};

    const gap = 20;
    const tooltipWidth = 380;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    if (slideIndex === 0) {
      // Left Column -> Show on the right
      top = spotlightRect.top;
      left = spotlightRect.left + spotlightRect.width + gap;
    } else if (slideIndex === 1) {
      // Center Column -> Show below the card
      top = spotlightRect.top + spotlightRect.height + gap;
      left = spotlightRect.left + (spotlightRect.width - tooltipWidth) / 2;
    } else if (slideIndex === 2) {
      // Right Column -> Show on the left
      top = spotlightRect.top;
      left = spotlightRect.left - tooltipWidth - gap;
    } else if (slideIndex === 3) {
      // Sync Button -> Show below, aligned right
      top = spotlightRect.top + spotlightRect.height + gap;
      left = spotlightRect.left + spotlightRect.width - tooltipWidth;
    }

    // Boundary check safety clamping using dynamically measured tooltip height
    left = Math.max(gap, Math.min(left, viewportWidth - tooltipWidth - gap));
    top = Math.max(gap, Math.min(top, viewportHeight - tooltipHeight - gap));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
    };
  };

  const tooltipStyle = getTooltipStyle();
  const isMobile = windowWidth < 1024;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Background Mask Clickable Layer */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-transparent cursor-pointer z-30"
        title="Click anywhere to exit tour"
      />

      {/* Spotlight highlight overlay */}
      {spotlightRect && (
        <div
          className="fixed transition-all duration-300 ease-out z-40 rounded-2xl border-2 border-indigo-500 shadow-[0_0_0_9999px_rgba(8,12,24,0.82)] pointer-events-none"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        >
          {/* Accent Ping rings */}
          <div className="absolute -inset-1.5 border border-indigo-400/50 rounded-2xl animate-ping opacity-25" />
        </div>
      )}

      {/* Floating Info Card */}
      <div
        ref={tooltipRef}
        style={isMobile ? {} : tooltipStyle}
        className={`z-50 glass-card p-6 sm:p-7 rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col justify-between max-h-[85vh] overflow-y-auto animate-fade-in ${
          isMobile
            ? 'fixed bottom-4 left-4 right-4 max-w-lg mx-auto border-indigo-500/40 bg-slate-950/95 backdrop-blur-lg'
            : 'bg-slate-950/90 backdrop-blur-md transition-all duration-300'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          title="Exit Tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top slide progress indicator dots */}
        <div className="flex items-center gap-1.5 mb-5 pr-8 shrink-0">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-grow transition-all duration-300 ${
                idx === slideIndex
                  ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                  : idx < slideIndex
                  ? 'bg-indigo-500/40'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Slide description content */}
        <div className="space-y-4 flex-grow">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${currentSlide.iconColor}`}>
              <SlideIcon className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Step {slideIndex + 1} of 4</span>
              <h3 className="text-base font-extrabold text-white leading-tight">{currentSlide.title}</h3>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {currentSlide.description}
          </p>

          {/* Bullet points list */}
          <div className="space-y-3 pt-2.5 border-t border-slate-900/60">
            {currentSlide.bullets.map((bullet, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                <div>
                  <strong className="text-slate-100">{bullet.label}: </strong>
                  <span className="text-slate-400 leading-relaxed">{bullet.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action button controls */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-900/60 shrink-0">
          <button
            onClick={handlePrev}
            disabled={slideIndex === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              slideIndex === 0
                ? 'opacity-40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
          >
            {slideIndex === slides.length - 1 ? 'Finish Tour' : 'Next Step'}
            {slideIndex < slides.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
