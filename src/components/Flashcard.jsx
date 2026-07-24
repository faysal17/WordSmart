import React, { useState } from 'react';
import { Volume2, Sparkles, RotateCw, Award, Clock, Eye } from 'lucide-react';

export default function Flashcard({ card, progress, onGradeCard, isFlipped, setIsFlipped }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakWord = (e) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const statusColors = {
    new: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    learning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    review: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    mastered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  };

  return (
    <div className="w-full max-w-xl mx-auto perspective-1000 my-4">
      <div 
        onClick={handleCardClick}
        className={`relative min-h-[380px] sm:min-h-[420px] w-full rounded-3xl cursor-pointer transition-all duration-700 transform-style-3d glass-card hover:border-indigo-500/40 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT OF CARD */}
        <div className={`absolute inset-0 w-full h-full p-8 flex flex-col justify-between backface-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 transition-opacity duration-300 ${
          isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Chunk {card.chunk}
            </span>

            <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${statusColors[progress?.status || 'new']}`}>
              {progress?.status || 'new'}
            </span>
          </div>

          {/* Center Word */}
          <div className="my-auto text-center flex flex-col items-center justify-center space-y-4">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans'] drop-shadow-md">
              {card.word}
            </h2>
            
            <button
              type="button"
              onClick={speakWord}
              className={`p-3 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 transition-all duration-200 border border-slate-700 hover:border-indigo-500/50 ${
                isSpeaking ? 'scale-110 ring-2 ring-indigo-400' : ''
              }`}
              title="Listen pronunciation"
            >
              <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* Bottom Show Answer Button Callout */}
          <div className="flex items-center justify-center text-xs text-slate-400 font-medium">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
              className="flex items-center gap-2 bg-indigo-600/30 hover:bg-indigo-600/50 px-5 py-2.5 rounded-full border border-indigo-500/40 text-indigo-200 font-semibold shadow-lg transition active:scale-95"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              Show Answer (Click or Tap)
            </button>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div className={`absolute inset-0 w-full h-full p-8 flex flex-col justify-between backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-slate-900/95 via-indigo-950/40 to-slate-950/95 border border-indigo-500/30 transition-opacity duration-300 ${
          isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white">{card.word}</h3>
              {card.pronunciation && (
                <span className="text-sm font-medium text-indigo-300/90 font-mono bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-800/40">
                  [{card.pronunciation}]
                </span>
              )}
            </div>
            
            <button
              type="button"
              onClick={speakWord}
              className="p-2 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 transition-all border border-slate-700"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Details Body */}
          <div className="my-auto space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {card.partOfSpeech || 'n/a'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
                {card.definition}
              </p>
            </div>

            {/* SRS Info Stats */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Interval: <strong className="text-slate-200">{progress?.interval || 0}d</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Ease Factor: <strong className="text-slate-200">{progress?.easeFactor || 2.5}</strong>
              </span>
            </div>
          </div>

          {/* Flip Hint */}
          <div className="text-center text-xs text-slate-400">
            Select your recall strength below to schedule next review
          </div>
        </div>
      </div>

      {/* SRS RATING BUTTONS (Shown when card is flipped) */}
      {isFlipped && (
        <div className="mt-6 grid grid-cols-3 gap-3 animate-fade-in">
          <button
            onClick={() => onGradeCard(2)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 transition-all duration-200 group active:scale-95 cursor-pointer"
          >
            <span className="font-bold text-sm sm:text-base group-hover:scale-105 transition-transform">Hard</span>
            <span className="text-[11px] text-rose-300/70 mt-0.5">Reset / 1d</span>
          </button>

          <button
            onClick={() => onGradeCard(4)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 transition-all duration-200 group active:scale-95 cursor-pointer"
          >
            <span className="font-bold text-sm sm:text-base group-hover:scale-105 transition-transform">Good</span>
            <span className="text-[11px] text-indigo-300/70 mt-0.5">Standard</span>
          </button>

          <button
            onClick={() => onGradeCard(5)}
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-200 group active:scale-95 cursor-pointer"
          >
            <span className="font-bold text-sm sm:text-base group-hover:scale-105 transition-transform">Easy</span>
            <span className="text-[11px] text-emerald-300/70 mt-0.5">Boost Interval</span>
          </button>
        </div>
      )}
    </div>
  );
}
