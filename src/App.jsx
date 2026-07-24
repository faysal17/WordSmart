import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Trophy, RotateCcw, AlertTriangle, CloudOff } from 'lucide-react';
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
        data.forEach(item => {
          progressMap[item.word_id] = {
            repetitions: item.repetitions,
            interval: item.interval,
            easeFactor: item.ease_factor,
            lastReviewedDate: item.last_reviewed_date,
            nextReviewDate: item.next_review_date,
            status: item.status
          };
        });
        setUserProgressMap(progressMap);
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

  // Rebuild the session deck based on chosen chunk and status filter
  const rebuildSessionDeck = () => {
    const chunkFiltered = selectedChunk === 'ALL'
      ? words
      : words.filter(w => w.chunk === parseInt(selectedChunk, 10));

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

  // Rebuild session deck on filter, chunk, loading, or identity changes
  useEffect(() => {
    if (words.length > 0) {
      rebuildSessionDeck();
    }
  }, [words, selectedChunk, studyModeFilter, user, syncVersion]);

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

    words.forEach(w => {
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

    return {
      dueToday,
      mastered,
      learning,
      streak: Object.keys(userProgressMap).length > 0 ? 1 : 0
    };
  }, [words, userProgressMap]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 max-w-4xl mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* HEADER & USER BAR */}
      <div>
        <StatsHeader
          stats={stats}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          onLogout={handleLogout}
        />

        {!user && !isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Demo Mode: Cloud sync is inactive. Configure Supabase environment variables to persist across devices.</span>
            </div>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition"
            >
              Guide
            </button>
          </div>
        )}

        {/* CHUNK FILTERING */}
        <ChunkSelector
          chunks={availableChunks}
          selectedChunk={selectedChunk}
          setSelectedChunk={setSelectedChunk}
          studyModeFilter={studyModeFilter}
          setStudyModeFilter={setStudyModeFilter}
          totalWords={words.length}
          currentChunkCount={sessionDeck.length}
        />
      </div>

      {/* CORE ACTIVE RECALL FLASHCARD */}
      <main className="my-8">
        {currentCard ? (
          <div>
            <div className="flex flex-col items-center gap-3 max-w-xl mx-auto px-2 mb-4">
              <div className="flex items-center justify-between w-full text-xs text-slate-400">
                <span className="font-medium">Card {currentIndex + 1} of {sessionDeck.length}</span>
                <button
                  onClick={rebuildSessionDeck}
                  className="flex items-center gap-1 hover:text-indigo-400 transition text-xs font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart Queue
                </button>
              </div>

              {/* Numbered card navigation buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 py-1 w-full max-h-24 overflow-y-auto pr-1">
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
                      className={`relative w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-110 ring-2 ring-indigo-400/50'
                          : isReviewed
                          ? 'bg-slate-900/60 hover:bg-slate-800 text-emerald-400 border-emerald-500/40 hover:border-emerald-500/60'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {idx + 1}
                      {isReviewed && !isCurrent && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-950 transform translate-x-1/4 -translate-y-1/4" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Flashcard
              card={currentCard}
              progress={currentProgress}
              onGradeCard={handleGradeCard}
              isFlipped={isFlipped}
              setIsFlipped={setIsFlipped}
            />
          </div>
        ) : (
          <div className="p-8 rounded-3xl glass-card text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">All Cards Completed!</h3>
            <p className="text-xs text-slate-400">
              You have reviewed all cards in this chunk for today. Great job maintaining your recall!
            </p>
            <button
              onClick={rebuildSessionDeck}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
            >
              Review Again
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
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
