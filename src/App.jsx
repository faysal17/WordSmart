import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Trophy, RotateCcw, AlertTriangle, CloudOff, Clock, CheckCircle, Flame, Brain } from 'lucide-react';
import { loadVocabularyCSV } from './utils/csvParser';
import { calculateSM2, sortCardsForStudySession, DEFAULT_SM2_CARD } from './utils/sm2';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Flashcard from './components/Flashcard';
import ChunkSelector from './components/ChunkSelector';
import StatsHeader from './components/StatsHeader';
import AuthModal from './components/AuthModal';
import SupabaseGuideModal from './components/SupabaseGuideModal';

export default function App() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // User Authentication & Cloud Progress
  const [user, setUser] = useState(null);
  const [userProgressMap, setUserProgressMap] = useState({});
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Card Status Filter & Session states
  const [studyModeFilter, setStudyModeFilter] = useState('ALL');
  const [sessionDeck, setSessionDeck] = useState([]);
  const [syncVersion, setSyncVersion] = useState(0);
  const [reviewedCardIds, setReviewedCardIds] = useState(new Set());

  // Unlocked chunks (active learning progression)
  const [unlockedChunks, setUnlockedChunks] = useState(() => {
    const saved = localStorage.getItem('wordsmart_unlocked_chunks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => a - b);
        }
      } catch (e) {
        console.error('Failed to parse local unlocked chunks:', e);
      }
    }
    return [1]; // Start with only Chunk 1 unlocked
  });

  // Sync unlocked chunks to cloud (Supabase)
  const syncUnlockedChunksToCloud = async (chunks) => {
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: '__unlocked_chunks__',
            status: chunks.join(','),
            repetitions: 0,
            interval: 0,
            ease_factor: 2.5,
            next_review_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,word_id' });
      } catch (err) {
        console.error('Failed to sync active chunks to cloud:', err);
      }
    }
  };

  const updateUnlockedChunks = (newChunks) => {
    const sorted = Array.from(new Set(newChunks)).sort((a, b) => a - b);
    setUnlockedChunks(sorted);
    localStorage.setItem('wordsmart_unlocked_chunks', JSON.stringify(sorted));
    syncUnlockedChunksToCloud(sorted);
  };

  const toggleChunkManual = (chunkNum) => {
    let next;
    if (unlockedChunks.includes(chunkNum)) {
      if (unlockedChunks.length === 1) return; // Prevent removing the last active chunk
      next = unlockedChunks.filter(c => c !== chunkNum);
    } else {
      next = [...unlockedChunks, chunkNum];
    }
    updateUnlockedChunks(next);
  };

  // Load CSV vocabulary on mount
  useEffect(() => {
    async function initData() {
      try {
        const loadedWords = await loadVocabularyCSV();
        setWords(loadedWords);
      } catch (err) {
        console.error('Failed to load CSV:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Listen to Supabase Auth state & load progress
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserProgressFromCloud(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserProgressFromCloud(session.user.id);
      } else {
        setUserProgressMap({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch progress from Supabase database
  const fetchUserProgressFromCloud = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user progress:', error);
        return;
      }

      if (data) {
        const progressMap = {};
        let cloudUnlocked = null;
        data.forEach(item => {
          if (item.word_id === '__unlocked_chunks__') {
            try {
              cloudUnlocked = item.status.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            } catch (e) {
              console.error('Failed to parse cloud unlocked chunks:', e);
            }
          } else {
            progressMap[item.word_id] = {
              repetitions: item.repetitions,
              interval: item.interval,
              easeFactor: item.ease_factor,
              lastReviewedDate: item.last_reviewed_date,
              nextReviewDate: item.next_review_date,
              status: item.status
            };
          }
        });
        setUserProgressMap(progressMap);
        if (cloudUnlocked && cloudUnlocked.length > 0) {
          const sorted = cloudUnlocked.sort((a, b) => a - b);
          setUnlockedChunks(sorted);
          localStorage.setItem('wordsmart_unlocked_chunks', JSON.stringify(sorted));
        } else {
          // Cloud has no unlocked chunks data yet, push local state to cloud
          syncUnlockedChunksToCloud(unlockedChunks);
        }
        setSyncVersion(v => v + 1);
      }
    } catch (err) {
      console.error('Cloud sync fetch error:', err);
    }
  };

  // Available unique chunks
  const availableChunks = useMemo(() => {
    const chunkSet = new Set(words.map(w => w.chunk));
    return Array.from(chunkSet).sort((a, b) => a - b);
  }, [words]);

  // Only consider words that belong to the active/unlocked chunks
  const activeUnloadedWords = useMemo(() => {
    return words.filter(w => unlockedChunks.includes(w.chunk));
  }, [words, unlockedChunks]);

  // Rebuild the session deck based on chosen chunk and status filter
  const rebuildSessionDeck = () => {
    // Only study active chunk words
    const chunkFiltered = selectedChunk === 'ALL'
      ? activeUnloadedWords
      : activeUnloadedWords.filter(w => w.chunk === parseInt(selectedChunk, 10));

    const statusFiltered = chunkFiltered.filter(w => {
      const prog = userProgressMap[w.id];
      const isNew = !prog || prog.repetitions === 0;
      if (studyModeFilter === 'NEW') return isNew;
      if (studyModeFilter === 'STUDIED') return !isNew;
      return true;
    });

    const sorted = sortCardsForStudySession(statusFiltered, userProgressMap);
    setSessionDeck(sorted);
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewedCardIds(new Set());
  };

  // Rebuild session deck on filter, chunk, loading, identity, or unlocked chunks changes
  useEffect(() => {
    if (words.length > 0) {
      rebuildSessionDeck();
    }
  }, [words, selectedChunk, studyModeFilter, user, syncVersion, unlockedChunks]);

  // Reset selectedChunk dropdown if the selected chunk is no longer in unlockedChunks list
  useEffect(() => {
    if (selectedChunk !== 'ALL' && !unlockedChunks.includes(parseInt(selectedChunk, 10))) {
      setSelectedChunk('ALL');
    }
  }, [unlockedChunks, selectedChunk]);

  // Check if all active words have been studied at least once
  const hasLearnedActiveWords = useMemo(() => {
    if (activeUnloadedWords.length === 0) return false;
    return activeUnloadedWords.every(w => {
      const prog = userProgressMap[w.id];
      return prog && prog.repetitions > 0;
    });
  }, [activeUnloadedWords, userProgressMap]);

  // Find the next available locked chunk
  const nextAvailableChunk = useMemo(() => {
    return availableChunks.find(c => !unlockedChunks.includes(c)) || null;
  }, [availableChunks, unlockedChunks]);

  const handleUnlockNextChunk = () => {
    if (nextAvailableChunk) {
      updateUnlockedChunks([...unlockedChunks, nextAvailableChunk]);
    }
  };

  // Current Card
  const currentCard = sessionDeck[currentIndex] || null;
  const currentProgress = currentCard ? (userProgressMap[currentCard.id] || DEFAULT_SM2_CARD) : DEFAULT_SM2_CARD;

  // Grade card with SM-2 algorithm
  const handleGradeCard = async (grade) => {
    if (!currentCard) return;

    const updatedProg = calculateSM2(currentProgress, grade);

    // Update local state map immediately for instant UX feedback
    const updatedMap = {
      ...userProgressMap,
      [currentCard.id]: updatedProg
    };
    setUserProgressMap(updatedMap);

    // If user is authenticated & Supabase configured, save to cloud DB
    if (user && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: currentCard.id,
            repetitions: updatedProg.repetitions,
            interval: updatedProg.interval,
            ease_factor: updatedProg.easeFactor,
            last_reviewed_date: updatedProg.lastReviewedDate,
            next_review_date: updatedProg.nextReviewDate,
            status: updatedProg.status,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,word_id' });
      } catch (err) {
        console.error('Failed to sync card progress to Supabase:', err);
      }
    }

    // Mark card as reviewed in this session
    setReviewedCardIds((prev) => {
      const next = new Set(prev);
      next.add(currentCard.id);
      return next;
    });

    // Advance or wrap around queue
    setIsFlipped(false);
    if (sessionDeck.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % sessionDeck.length);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setUserProgressMap({});
    }
  };

  // Dashboard Stats Computation
  const stats = useMemo(() => {
    const now = new Date().getTime();
    let dueToday = 0;
    let mastered = 0;
    let learning = 0;

    activeUnloadedWords.forEach(w => {
      const prog = userProgressMap[w.id];
      if (prog) {
        if (prog.status === 'mastered') mastered++;
        else if (prog.status === 'learning' || prog.status === 'review') learning++;

        if (new Date(prog.nextReviewDate).getTime() <= now) {
          dueToday++;
        }
      } else {
        // Unseen card counts as due for review if today's study queue
        dueToday++;
      }
    });

    const activeProgressCount = Object.keys(userProgressMap).filter(
      id => id !== '__unlocked_chunks__'
    ).length;

    return {
      dueToday,
      mastered,
      learning,
      streak: activeProgressCount > 0 ? 1 : 0
    };
  }, [activeUnloadedWords, userProgressMap]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wider text-slate-400">Loading Vocabulary Deck...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 md:p-4 max-w-7xl mx-auto font-['Plus_Jakarta_Sans',sans-serif] lg:overflow-hidden">
      {/* HEADER & USER BAR */}
      <div className="shrink-0">
        <StatsHeader
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          onLogout={handleLogout}
        />

        {!user && !isSupabaseConfigured && (
          <div className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Demo Mode: Cloud sync is inactive. Configure Supabase environment variables to persist across devices.</span>
            </div>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition text-[10px]"
            >
              Guide
            </button>
          </div>
        )}
      </div>

      {/* THREE-COLUMN GRID LAYOUT */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch my-2 overflow-y-auto lg:overflow-hidden w-full">
        {/* Left Column: Stats & Filters (col-span-3) */}
        <div className="lg:col-span-3 lg:h-full flex flex-col gap-3 shrink-0 justify-start">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-white leading-tight">{stats.dueToday}</div>
                <div className="text-[10px] font-bold text-slate-400">Due Today</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-white leading-tight">{stats.mastered}</div>
                <div className="text-[10px] font-bold text-slate-400">Mastered</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-white leading-tight">{stats.learning}</div>
                <div className="text-[10px] font-bold text-slate-400">In Progress</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-white leading-tight">{stats.streak} Days</div>
                <div className="text-[10px] font-bold text-slate-400">Streak</div>
              </div>
            </div>
          </div>

          {/* Chunk Selector */}
          <ChunkSelector
            chunks={unlockedChunks}
            selectedChunk={selectedChunk}
            setSelectedChunk={setSelectedChunk}
            studyModeFilter={studyModeFilter}
            setStudyModeFilter={setStudyModeFilter}
            totalWords={activeUnloadedWords.length}
            currentChunkCount={sessionDeck.length}
          />
        </div>

        {/* Center Column: Card View (col-span-6) */}
        <div className="lg:col-span-6 lg:h-full flex flex-col justify-center items-center overflow-hidden py-2 shrink-0">
          {currentCard ? (
            <div className="w-full flex flex-col justify-center items-center gap-2">
              <div className="flex items-center justify-between w-full max-w-xl text-xs text-slate-400 px-2 shrink-0">
                <span className="font-semibold">Card {currentIndex + 1} of {sessionDeck.length}</span>
                <button
                  onClick={rebuildSessionDeck}
                  className="flex items-center gap-1 hover:text-indigo-400 transition text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart Queue
                </button>
              </div>

              {/* Numbered card navigation buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 py-1 w-full max-w-xl max-h-16 overflow-y-auto pr-1 shrink-0">
                {sessionDeck.map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isReviewed = reviewedCardIds.has(sessionDeck[idx].id);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsFlipped(false);
                      }}
                      className={`relative w-7 h-7 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-105 ring-1 ring-indigo-450/40'
                          : isReviewed
                          ? 'bg-slate-900/60 hover:bg-slate-800 text-emerald-400 border-emerald-500/40 hover:border-emerald-500/60'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {idx + 1}
                      {isReviewed && !isCurrent && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-950 transform translate-x-1/4 -translate-y-1/4" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="w-full shrink-0">
                <Flashcard
                  card={currentCard}
                  progress={currentProgress}
                  onGradeCard={handleGradeCard}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                />
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl glass-card text-center space-y-4 max-w-md mx-auto my-auto shadow-xl shrink-0">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">All Cards Completed!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You have reviewed all cards in this chunk for today. Great job maintaining your recall!
              </p>
              
              {nextAvailableChunk ? (
                <div className="pt-3 border-t border-slate-800/80 mt-1 space-y-2.5">
                  <p className="text-[11px] text-indigo-300 font-semibold leading-relaxed">
                    You have finished studying all active cards. Ready to expand your learning?
                  </p>
                  <button
                    onClick={handleUnlockNextChunk}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                  >
                    Unlock & Add Chunk {nextAvailableChunk}
                  </button>
                </div>
              ) : (
                <button
                  onClick={rebuildSessionDeck}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
                >
                  Review Again
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Chunk Manager (col-span-3) */}
        <div className="lg:col-span-3 lg:h-full flex flex-col bg-slate-900/20 border border-slate-800/80 p-3 rounded-2xl overflow-hidden shrink-0 justify-between gap-3">
          <div className="flex flex-col overflow-hidden flex-grow">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between shrink-0 mb-1">
              <span>Learning Chunk Manager</span>
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                {unlockedChunks.length} Active
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed shrink-0 mb-2">
              Select chunks to include in your active study sessions.
            </p>
            
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 overflow-y-auto pr-1 flex-grow scrollbar-thin">
              {availableChunks.map((chunkNum) => {
                const isUnlocked = unlockedChunks.includes(chunkNum);
                return (
                  <label
                    key={chunkNum}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all duration-200 select-none ${
                      isUnlocked
                        ? 'bg-indigo-600/15 border-indigo-500/20 text-white'
                        : 'bg-slate-900/40 border-slate-800/40 text-slate-500 hover:text-slate-350 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isUnlocked}
                      onChange={() => toggleChunkManual(chunkNum)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3 h-3 cursor-pointer shrink-0"
                    />
                    <span>Chunk {chunkNum}</span>
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className="flex gap-2 pt-1 border-t border-slate-800 shrink-0">
            <button
              onClick={() => updateUnlockedChunks(availableChunks)}
              className="flex-1 py-1.5 text-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 transition"
            >
              Select All
            </button>
            <button
              onClick={() => updateUnlockedChunks([1])}
              className="flex-1 py-1.5 text-center bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold rounded-lg text-slate-300 transition"
            >
              Reset to 1
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center text-[11px] text-slate-500 py-2.5 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <p>WordSmart Vocabulary Trainer • Powered by SM-2 Algorithm</p>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsGuideModalOpen(true)} className="hover:text-slate-300 transition">
            Supabase Setup Guide
          </button>
          <span>•</span>
          <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-slate-300 transition">
            Account Sync
          </button>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          if (authUser) fetchUserProgressFromCloud(authUser.id);
        }}
      />

      <SupabaseGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
