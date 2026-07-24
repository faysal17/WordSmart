import React, { useState } from 'react';
import { X, Flame, Sparkles, Lock, Cloud, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

export default function HelpGuideModal({ isOpen, onClose }) {
  const [slideIndex, setSlideIndex] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: "Learning Metrics & Streak Tracker",
      description: "Located in the left column, this panel tracks your overall progress and memory retention health.",
      icon: Flame,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      bullets: [
        { label: "Streak Tracker", desc: "Tracks your consecutive daily study sessions to help build consistency." },
        { label: "Card Status Filters", desc: "Toggle between Due (scheduled reviews for today), New (unlearned words), or All (entire active set)." },
        { label: "Forgetting Curve Graph", desc: "An SVG retention curve that simulates your memory decay rate over a 7-day projection timeline using the SM-2 algorithm." }
      ]
    },
    {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl p-6 sm:p-7 glass-card rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Progress Indicator */}
        <div className="flex items-center gap-1.5 mb-6">
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

        {/* Slide Content Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${currentSlide.iconColor}`}>
              <SlideIcon className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Step {slideIndex + 1} of 4</span>
              <h3 className="text-lg font-bold text-white leading-tight">{currentSlide.title}</h3>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {currentSlide.description}
          </p>

          {/* Bullet Points */}
          <div className="space-y-3.5 pt-2 border-t border-slate-900">
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

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-900 shrink-0">
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
            {slideIndex === slides.length - 1 ? 'Close Tour' : 'Next'}
            {slideIndex < slides.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
