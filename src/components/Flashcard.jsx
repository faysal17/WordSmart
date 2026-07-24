import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, Award, Clock, Eye, MessageSquare, Plus, X, Pencil, Trash2 } from 'lucide-react';

export default function Flashcard({ 
  card, 
  progress, 
  onGradeCard, 
  isFlipped, 
  setIsFlipped,
  userSentences = [],
  onAddUserSentence,
  onEditUserSentence,
  onDeleteUserSentence
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSentences, setShowSentences] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (idx, text) => {
    setEditingIndex(idx);
    setEditText(text);
  };

  const handleSaveEdit = (idx) => {
    if (editText.trim() && onEditUserSentence) {
      onEditUserSentence(userSentences[idx], editText.trim());
    }
    setEditingIndex(-1);
  };

  // Always reset to standard answer view and close editor when card changes or when flip state changes
  useEffect(() => {
    setShowSentences(false);
    setEditingIndex(-1);
    setEditText('');
  }, [card.id, isFlipped]);

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
    <div className="w-full max-w-xl mx-auto h-full flex flex-col">
      {/* CARD MAIN CONTAINER */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative responsive-card w-full rounded-3xl cursor-pointer transition-all duration-300 glass-card hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col justify-between overflow-hidden p-5 sm:p-6"
      >
        {!isFlipped ? (
          /* FRONT OF CARD */
          <div className="flex flex-col justify-between flex-grow min-h-[180px]">
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
                className={`p-2.5 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 transition-all duration-200 border border-slate-700 hover:border-indigo-500/50 ${isSpeaking ? 'scale-110 ring-2 ring-indigo-400' : ''
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
          <div className="flex flex-col flex-grow min-h-[180px]">
            {/* Top Bar — fixed at top */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <h3 className="text-xl sm:text-2xl xl:text-3xl font-bold text-white truncate">{card.word}</h3>
                {card.pronunciation && (
                  <span className="text-xs sm:text-sm font-semibold text-indigo-300 font-mono bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-800/50 shrink-0">
                    [{card.pronunciation}]
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!showSentences ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSentences(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-650/20 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer active:scale-95 text-[11px] font-bold shrink-0"
                      title="View Sentences"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Sentences</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={speakWord}
                      className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 transition border border-slate-700 shrink-0 cursor-pointer"
                      title="Listen pronunciation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSentences(false);
                    }}
                    className="p-2 rounded-full bg-slate-800 hover:bg-rose-600/30 text-rose-350 hover:text-rose-300 hover:border-rose-500/50 transition border border-slate-700 shrink-0 cursor-pointer animate-fade-in"
                    title="Close Sentences"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Details and Content Block — intercept click to stop flipping card */}
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="flex-1 flex flex-col min-h-0"
            >
              {showSentences ? (
                /* SENTENCES BLOCK — covers/replaces standard details */
                <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 py-2.5 flex flex-col justify-between space-y-3">
                  {/* List of Sentences */}
                  <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 min-h-[100px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Example Sentences</span>
                    </div>

                    {!card.sentence && userSentences.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center my-auto flex flex-col items-center justify-center min-h-[120px]">
                        <p className="text-[11px] text-slate-500 font-semibold">No sentences saved for this word yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* App CSV Sentence */}
                        {card.sentence && (
                          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/10 text-xs text-indigo-200 leading-relaxed font-medium">
                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">App Example</span>
                            {card.sentence}
                          </div>
                        )}

                        {/* Custom User Sentences */}
                        {userSentences.map((sentence, idx) => (
                          <div 
                            key={idx} 
                            className="group relative p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/10 text-xs text-emerald-200 leading-relaxed font-medium flex items-center justify-between gap-3 min-h-[44px]"
                          >
                            {editingIndex === idx ? (
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleSaveEdit(idx);
                                }}
                                className="flex items-center gap-1.5 w-full"
                              >
                                <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="flex-grow px-2 py-1 rounded bg-slate-950 border border-emerald-500/40 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-0"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer shrink-0"
                                  title="Save Changes"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingIndex(-1)}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition cursor-pointer shrink-0"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            ) : (
                              <>
                                <div className="flex-grow min-w-0">
                                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">My Example</span>
                                  <span className="block break-words">{sentence}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(idx, sentence)}
                                    className="p-1 rounded text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300 transition cursor-pointer"
                                    title="Edit sentence"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteUserSentence(sentence)}
                                    className="p-1 rounded text-rose-400 hover:bg-rose-950/20 hover:text-rose-350 transition cursor-pointer"
                                    title="Delete sentence"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Sentence Input */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target;
                      const input = form.elements.sentenceInput;
                      const val = input.value.trim();
                      if (val) {
                        onAddUserSentence(val);
                        input.value = '';
                      }
                    }}
                    className="flex gap-2 pt-2 border-t border-slate-900/60 shrink-0"
                  >
                    <input
                      name="sentenceInput"
                      type="text"
                      placeholder="Write a custom sentence..."
                      className="flex-grow px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 text-xs text-slate-100 placeholder-slate-500 min-w-0"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                      title="Add sentence"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              ) : (
                /* DETAILS BODY (ORIGINAL) */
                <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 py-2 flex flex-col">
                  <div className="my-auto space-y-3.5 w-full animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                        {card.partOfSpeech || 'n/a'}
                      </span>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
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
                </div>
              )}
            </div>

            {/* SRS RATING BUTTONS — always pinned at bottom, never clipped */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onGradeCard(2); }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:border-rose-500/70 transition-all duration-200 group active:scale-95 cursor-pointer shadow-md"
              >
                <span className="font-extrabold text-xs group-hover:scale-105 transition-transform">Hard</span>
                <span className="text-[8px] text-rose-300/80 mt-0.5">Reset / 1d</span>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onGradeCard(4); }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 hover:border-indigo-500/70 transition-all duration-200 group active:scale-95 cursor-pointer shadow-md"
              >
                <span className="font-extrabold text-xs group-hover:scale-105 transition-transform">Good</span>
                <span className="text-[8px] text-indigo-300/80 mt-0.5">Standard</span>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onGradeCard(5); }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/70 transition-all duration-200 group active:scale-95 cursor-pointer shadow-md"
              >
                <span className="font-extrabold text-xs group-hover:scale-105 transition-transform">Easy</span>
                <span className="text-[8px] text-emerald-300/80 mt-0.5">Boost</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
