import React, { useState } from 'react';
import { Volume2, Sparkles, Award, Clock, Eye, RotateCw } from 'lucide-react';

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

  const statusColors = {
    new: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    learning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    review: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    mastered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  };

  return (
    <div className="w-full max-w-xl mx-auto my-1.5 space-y-3">
      {/* CARD MAIN CONTAINER */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative min-h-[300px] sm:min-h-[340px] lg:min-h-[320px] xl:min-h-[400px] w-full rounded-3xl cursor-pointer transition-all duration-300 glass-card hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col justify-between overflow-hidden p-6 sm:p-7"
      >
        {!isFlipped ? (
          /* FRONT OF CARD */
          <div className="flex flex-col justify-between h-full min-h-[240px] sm:min-h-[280px] lg:min-h-[260px] xl:min-h-[330px]">
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans'] drop-shadow-md">
                {card.word}
              </h2>
              
              <button
                type="button"
                onClick={speakWord}
                className={`p-2.5 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 transition-all duration-200 border border-slate-700 hover:border-indigo-500/50 ${
                  isSpeaking ? 'scale-110 ring-2 ring-indigo-400' : ''
                }`}
                title="Listen pronunciation"
              >
                <Volume2 className={`w-4.5 h-4.5 ${isSpeaking ? 'animate-pulse text-indigo-400' : ''}`} />
              </button>
            </div>

            {/* Show Answer Action Callout */}
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                Show Answer (Click Card)
              </button>
            </div>
          </div>
        ) : (
          /* BACK OF CARD (ANSWER REVEALED) */
          <div className="flex flex-col justify-between h-full min-h-[240px] sm:min-h-[280px] lg:min-h-[260px] xl:min-h-[330px]">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white">{card.word}</h3>
                {card.pronunciation && (
                  <span className="text-xs sm:text-sm font-semibold text-indigo-300 font-mono bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-800/50">
                    [{card.pronunciation}]
                  </span>
                )}
              </div>
              
              <button
                type="button"
                onClick={speakWord}
                className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 transition border border-slate-700"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Details Body */}
            <div className="my-auto space-y-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                  {card.partOfSpeech || 'n/a'}
                </span>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium">
                  {card.definition}
                </p>
              </div>

              {/* SRS Stats */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Interval: <strong className="text-white">{progress?.interval || 0}d</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Ease Factor: <strong className="text-white">{progress?.easeFactor || 2.5}</strong>
                </span>
              </div>
            </div>

            {/* Hide / Flip Back Callout */}
            <div className="flex items-center justify-center pt-1.5">
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-indigo-400" />
                Select your recall grade below to proceed
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SRS RATING BUTTONS (Shown when card is flipped / answer revealed) */}
      {isFlipped && (
        <div className="grid grid-cols-3 gap-2.5 animate-fade-in">
          <button
            type="button"
            onClick={() => onGradeCard(2)}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:border-rose-500/70 transition-all duration-200 group active:scale-95 cursor-pointer shadow-lg"
          >
            <span className="font-extrabold text-xs sm:text-sm group-hover:scale-105 transition-transform">Hard</span>
            <span className="text-[9px] text-rose-300/80 mt-0.5">Reset / 1d</span>
          </button>

          <button
            type="button"
            onClick={() => onGradeCard(4)}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 hover:border-indigo-500/70 transition-all duration-200 group active:scale-95 cursor-pointer shadow-lg"
          >
            <span className="font-extrabold text-xs sm:text-sm group-hover:scale-105 transition-transform">Good</span>
            <span className="text-[9px] text-indigo-300/80 mt-0.5">Standard</span>
          </button>

          <button
            type="button"
            onClick={() => onGradeCard(5)}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/70 transition-all duration-200 group active:scale-95 cursor-pointer shadow-lg"
          >
            <span className="font-extrabold text-xs sm:text-sm group-hover:scale-105 transition-transform">Easy</span>
            <span className="text-[9px] text-emerald-300/80 mt-0.5">Boost Interval</span>
          </button>
        </div>
      )}
    </div>
  );
}
